const DirectoryModel = require("../models/site-directory.model");
const ConfigurationModel = require("../models/configuration.model");
const { DIRECTORY_ICONS, SOCIAL_PLATFORMS, publicDirectoryIcons, publicSocialPlatforms } = require("../config/site-directory");
const { recordAuditEvent } = require("../services/audit-log.service");
const { removeDirectoryImage, removeStoredDirectoryImage } = require("../middlewares/directory-image.middleware");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const id = (value, label = "ID") => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw fail(`A valid ${label} is required`);
  return parsed;
};
const text = (value, label, max, { required = false } = {}) => {
  const normalized = String(value || "").trim();
  if (required && !normalized) throw fail(`${label} is required`);
  if (normalized.length > max) throw fail(`${label} must not exceed ${max} characters`);
  return normalized || null;
};
const key = (value, label) => {
  const normalized = text(value, label, 80, { required: true }).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!normalized) throw fail(`${label} is invalid`);
  return normalized;
};
const order = (value) => Math.min(100000, Math.max(0, Number.parseInt(value, 10) || 0));
const sendError = (res, error, fallback) => res.status(error.statusCode || (error.code === "ER_DUP_ENTRY" ? 409 : 500)).json({
  status: false,
  message: error.statusCode ? error.message : error.code === "ER_DUP_ENTRY" ? "A record with this stable key already exists" : fallback,
  error: process.env.NODE_ENV === "development" && !error.statusCode ? error.message : undefined,
});
const audit = async (req, resourceType, resourceId) => recordAuditEvent(req, {
  eventType: "CONFIGURATION_UPDATED", resourceType, resourceId,
}).catch((error) => console.error("Failed to audit directory update:", error.message));

const getPublicDirectory = async (_req, res) => {
  try { return res.json({ status: true, data: await DirectoryModel.listDirectory({ activeOnly: true }) }); }
  catch (error) { return sendError(res, error, "Failed to load public directory"); }
};

const getDirectoryConfiguration = async (_req, res) => {
  try {
    const data = await DirectoryModel.listDirectory({ activeOnly: false });
    return res.json({ status: true, data: { ...data, capabilities: {
      socialPlatforms: publicSocialPlatforms(), directoryIcons: publicDirectoryIcons(),
    } } });
  } catch (error) { return sendError(res, error, "Failed to load directory configuration"); }
};

const saveDepartmentProfile = async (req, res) => {
  try {
    const departmentId = id(req.params.id, "department ID");
    const iconKey = text(req.body.iconKey, "Icon", 40) || "building";
    if (!DIRECTORY_ICONS[iconKey]) throw fail("Unsupported department icon");
    const affected = await DirectoryModel.saveDepartmentProfile({
      id: departmentId, name: text(req.body.name, "Public name", 160),
      address: text(req.body.address, "Address", 500), summary: text(req.body.summary, "Summary", 5000),
      iconKey, sortOrder: order(req.body.sortOrder), isVisible: req.body.isVisible === true,
    });
    if (!affected) return res.status(404).json({ status: false, message: "Department not found" });
    await audit(req, "department_public_profile", departmentId);
    return res.json({ status: true, data: { id: departmentId } });
  } catch (error) { return sendError(res, error, "Failed to save department profile"); }
};

const saveFacility = async (req, res) => {
  try {
    const facilityId = req.params.id ? id(req.params.id, "facility ID") : null;
    if (facilityId && req.body.key !== undefined) {
      const existing = await DirectoryModel.findFacility(facilityId);
      if (!existing) return res.status(404).json({ status: false, message: "Facility not found" });
      if (key(req.body.key, "Facility key") !== existing.facility_key) throw fail("Facility keys are immutable", 409);
    }
    const departmentId = req.body.departmentId ? id(req.body.departmentId, "department ID") : null;
    if (departmentId && !await ConfigurationModel.findActiveCatalogItem("departments", departmentId)) throw fail("Facility department is unavailable");
    const itemId = await DirectoryModel.saveFacility({
      id: facilityId, key: facilityId ? undefined : key(req.body.key, "Facility key"), departmentId,
      name: text(req.body.name, "Facility name", 180, { required: true }),
      description: text(req.body.description, "Description", 10000), address: text(req.body.address, "Address", 500),
      sortOrder: order(req.body.sortOrder), isActive: req.body.isActive !== false,
    });
    if (!itemId) return res.status(404).json({ status: false, message: "Facility not found" });
    await audit(req, "public_facility", itemId);
    return res.status(facilityId ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save facility"); }
};

const normalizeContact = (body, existing = null) => {
  const type = text(body.type, "Contact type", 20, { required: true });
  if (!new Set(["phone", "email"]).has(type)) throw fail("Contact type must be phone or email");
  const displayValue = text(body.displayValue, "Display value", 190, { required: true });
  let linkValue = text(body.linkValue || displayValue, "Link value", 500, { required: true });
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkValue)) throw fail("Enter a valid contact email address");
    linkValue = linkValue.toLowerCase();
  } else {
    linkValue = linkValue.replace(/[\s().-]/g, "");
    if (!/^\+?\d{7,15}$/.test(linkValue)) throw fail("Enter a valid international phone link value");
  }
  return {
    key: existing ? undefined : key(body.key, "Contact key"), type,
    label: text(body.label, "Contact label", 80, { required: true }), displayValue, linkValue,
    sortOrder: order(body.sortOrder), isActive: body.isActive !== false,
  };
};

const saveContact = async (req, res) => {
  try {
    const ownerType = String(req.params.ownerType || "");
    if (!new Set(["department", "facility"]).has(ownerType)) throw fail("Unsupported directory owner");
    const ownerId = id(req.params.ownerId, `${ownerType} ID`);
    if (!await DirectoryModel.ownerExists(ownerType, ownerId)) throw fail(`${ownerType === "department" ? "Department" : "Facility"} not found`, 404);
    const contactId = req.params.contactId ? id(req.params.contactId, "contact ID") : null;
    const existing = contactId ? await DirectoryModel.findContact(ownerType, contactId) : null;
    if (contactId && !existing) return res.status(404).json({ status: false, message: "Contact method not found" });
    if (existing && req.body.key && key(req.body.key, "Contact key") !== existing.contact_key) throw fail("Contact keys are immutable", 409);
    const ownerColumn = ownerType === "department" ? "department_id" : "facility_id";
    if (existing && Number(existing[ownerColumn]) !== ownerId) throw fail("Contact method does not belong to this owner", 404);
    const contact = normalizeContact(req.body, existing);
    const itemId = await DirectoryModel.saveContact(ownerType, { id: contactId, ownerId, ...contact });
    await audit(req, `${ownerType}_public_contact`, itemId);
    return res.status(contactId ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save contact method"); }
};

const saveSocialLink = async (req, res) => {
  try {
    const socialId = req.params.id ? id(req.params.id, "social link ID") : null;
    const existing = socialId ? await DirectoryModel.findSocialLink(socialId) : null;
    if (socialId && !existing) return res.status(404).json({ status: false, message: "Social link not found" });
    const platformKey = existing?.platform_key || key(req.body.platformKey, "Platform key");
    if (!SOCIAL_PLATFORMS[platformKey]) throw fail("Unsupported social platform");
    if (existing && req.body.platformKey && key(req.body.platformKey, "Platform key") !== platformKey) throw fail("Platform keys are immutable", 409);
    const url = text(req.body.url, "Social URL", 500);
    if (url) {
      let parsed;
      try { parsed = new URL(url); } catch { throw fail("Enter a valid social URL"); }
      if (parsed.protocol !== "https:") throw fail("Social links must use HTTPS");
      if (!SOCIAL_PLATFORMS[platformKey].hosts.includes(parsed.hostname.toLowerCase())) {
        throw fail(`The URL must belong to ${SOCIAL_PLATFORMS[platformKey].label}`);
      }
    }
    if (req.body.isActive !== false && !url) throw fail("An active social link requires a URL");
    const itemId = await DirectoryModel.saveSocialLink({
      id: socialId, platformKey, label: text(req.body.label, "Label", 80, { required: true }),
      url, sortOrder: order(req.body.sortOrder), isActive: req.body.isActive !== false,
    });
    await audit(req, "public_social_link", itemId);
    return res.status(socialId ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save social link"); }
};

const uploadFacilityImage = async (req, res) => {
  try {
    const facilityId = id(req.params.id, "facility ID");
    const facility = await DirectoryModel.findFacility(facilityId);
    if (!facility) {
      await removeDirectoryImage(req.file);
      return res.status(404).json({ status: false, message: "Facility not found" });
    }
    const imagePath = `/uploads/directory/${req.file.filename}`;
    await DirectoryModel.updateFacilityImage(facilityId, imagePath);
    await removeStoredDirectoryImage(facility.image_path);
    await audit(req, "public_facility", facilityId);
    return res.json({ status: true, data: { id: facilityId, imagePath } });
  } catch (error) {
    await removeDirectoryImage(req.file);
    return sendError(res, error, "Failed to upload facility image");
  }
};

module.exports = {
  getDirectoryConfiguration, getPublicDirectory, saveContact,
  saveDepartmentProfile, saveFacility, saveSocialLink, uploadFacilityImage,
};
