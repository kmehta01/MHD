import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import QRCode from "qrcode";
import RecaptchaCheckbox from "../components/RecaptchaCheckbox";
import { formatPortalDateTime } from "../utils/date-format";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const stepDefinitions = [
  { key: "stepSubmission", caption: "A & B" },
  { key: "stepDetails", caption: "C" },
  { key: "stepSupporting", caption: "D & E" },
  { key: "stepDeclaration", caption: "F" },
];

const assistanceOptions = [
  { value: "Spanish", label: "Spanish" },
  { value: "Maya", label: "Maya", note: "Version in preparation" },
  {
    value: "Garifuna",
    label: "Garifuna",
    note: "Version in preparation",
  },
  { value: "Assisted completion", label: "Assisted completion" },
  { value: "Large print", label: "Large print" },
];

const contactOptions = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "mail", label: "Mail" },
  { value: "in_person", label: "In person" },
  { value: "whatsapp", label: "WhatsApp" },
];

const channelOptions = [
  { value: "in_person", label: "In person" },
  { value: "telephone", label: "Telephone" },
  { value: "email", label: "Email" },
  { value: "online_form", label: "Online form" },
  { value: "mail", label: "Mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "social_media", label: "Social media" },
  { value: "suggestion_box", label: "Suggestion box" },
];

const accommodationOptions = [
  { value: "sign_language", label: "Sign language interpreter" },
  { value: "wheelchair", label: "Wheelchair accessibility" },
  { value: "home_visit", label: "Home visit due to mobility" },
  { value: "translation", label: "Language translation" },
];

const fileTypeRegistry = {
  PDF: { accept: ".pdf", mimeTypes: ["application/pdf"] },
  DOC: { accept: ".doc", mimeTypes: ["application/msword"] },
  DOCX: { accept: ".docx", mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  JPG: { accept: ".jpg", mimeTypes: ["image/jpeg"] },
  JPEG: { accept: ".jpeg", mimeTypes: ["image/jpeg"] },
  PNG: { accept: ".png", mimeTypes: ["image/png"] },
  XLS: { accept: ".xls", mimeTypes: ["application/vnd.ms-excel"] },
  XLSX: { accept: ".xlsx", mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
};

const getToday = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
};

const createInitialForm = (defaultLocation = "") => ({
  assistance: [],
  assistance_other: "",
  submission_type: "named",
  comp_name: "",
  comp_phone: "",
  comp_address: "",
  comp_email: "",
  identification_number: "",
  category_id: "",
  department_id: "",
  location_id: "",
  contact_pref: "",
  on_behalf: "",
  affected_name: "",
  relationship: "",
  permission: "",
  issue_type: [],
  issue_other: "",
  channel: [],
  incident_date: "",
  incident_location: defaultLocation,
  description: "",
  desired_outcome: "",
  tried_resolve: "",
  prev_attempts: "",
  has_documents: "",
  has_witnesses: "",
  witness_name: "",
  witness_phone: "",
  accommodation: [],
  accommodation_other: "",
  declaration_confirm: false,
  signature: "",
  declaration_date: getToday(),
});

const formatFileSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const normalizeComplaintReference = (reference) => {
  const normalizedReference = String(reference || "")
    .trim()
    .toUpperCase();

  return /^[A-Z0-9]{1,8}-\d{4}-(?:0[1-9]|1[0-2])-\d{4,}$/.test(
    normalizedReference,
  )
    ? normalizedReference
    : "";
};

const buildTrackingPath = (reference) => {
  const normalizedReference = normalizeComplaintReference(reference);

  if (!normalizedReference) {
    return "#track-grievance";
  }

  const searchParams = new URLSearchParams({ ref: normalizedReference });
  return `?${searchParams.toString()}#track-grievance`;
};

const buildTrackingUrl = (reference) =>
  new URL(buildTrackingPath(reference), window.location.href).toString();

const Required = () => (
  <span className="grievance-required" aria-label="required">
    *
  </span>
);

function OptionTile({
  checked,
  disabled = false,
  label,
  name,
  note,
  onChange,
  type = "radio",
  value,
}) {
  return (
    <label className={`grievance-option-tile ${checked ? "is-selected" : ""}`}>
      <input
        checked={checked}
        disabled={disabled}
        name={name}
        onChange={onChange}
        type={type}
        value={value}
      />
      <span>
        {label}
        {note ? <small>{note}</small> : null}
      </span>
    </label>
  );
}

function SubmitComplaint() {
  const { settings, meta, language, t } = useOutletContext();
  const submissionSettings = settings.grievanceSubmission;
  const ticketSettings = settings.ticket;
  const privacySettings = settings.privacy;
  const [form, setForm] = useState(() => createInitialForm(settings.organization.defaultLocation));
  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetVersion, setCaptchaResetVersion] = useState(0);
  const [catalog, setCatalog] = useState({ categories: [], departments: [], locations: [] });
  const [catalogError, setCatalogError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [qrCodeReady, setQrCodeReady] = useState(false);
  const [qrCodeError, setQrCodeError] = useState("");
  const [statusLookup, setStatusLookup] = useState({
    tokenNumber: normalizeComplaintReference(
      new URLSearchParams(window.location.search).get("ref"),
    ),
    contactDetail: "",
  });
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const qrCanvasRef = useRef(null);
  const wizardRef = useRef(null);
  const steps = stepDefinitions.map((step) => ({ title: t(step.key), caption: step.caption }));

  const isAnonymous = form.submission_type === "anonymous";
  const maximumFiles = submissionSettings.allowMultipleAttachments
    ? submissionSettings.maximumAttachmentCount
    : 1;
  const allowedTypes = submissionSettings.allowedFileTypes
    .filter((type) => fileTypeRegistry[type]);
  const allowedMimeTypes = allowedTypes.flatMap((type) => fileTypeRegistry[type].mimeTypes);
  const attachmentAccept = allowedTypes.map((type) => fileTypeRegistry[type].accept).join(",");
  const captcha = meta?.capabilities?.captcha || {};
  const trackingMethod = ticketSettings.trackingVerificationMethod;
  const trackingDetailLabels = {
    "Ticket Number and Phone Number": "Phone number",
    "Ticket Number and Email Address": "Email address",
    "Ticket Number and Identification Number": "Identification number",
  };
  const trackingResultLabels = {
    tokenNumber: "Reference number",
    issueSummary: "Complaint subject",
    submittedAt: "Submitted",
    assignedDepartment: "Assigned department",
    status: "Status",
    updatedAt: "Last updated",
    resolutionSummary: "Resolution summary",
    closureDate: "Closure date",
  };

  const selectedIssueLabels = useMemo(
    () => [
      catalog.categories.find((item) => String(item.id) === String(form.category_id))?.name,
      form.issue_other,
    ].filter(Boolean),
    [catalog.categories, form.category_id, form.issue_other],
  );
  const availableCategories = useMemo(() => !form.department_id
    ? catalog.categories
    : catalog.categories.filter((item) => (item.departmentIds || []).map(String).includes(String(form.department_id))),
  [catalog.categories, form.department_id]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/public/catalog`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.status) throw new Error(payload.message || "Unable to load grievance options");
        if (active) setCatalog(payload.data);
      })
      .catch((error) => { if (active) setCatalogError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!confirmation?.tokenNumber || !qrCanvasRef.current ||
        !ticketSettings.displayTicketOnConfirmation || !ticketSettings.allowPublicTicketTracking) {
      return undefined;
    }

    let active = true;
    const trackingUrl = buildTrackingUrl(confirmation.tokenNumber);
    setQrCodeReady(false);

    QRCode.toCanvas(qrCanvasRef.current, trackingUrl, {
      color: {
        dark: "#062a4c",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
      margin: 1,
      width: 190,
    })
      .then(() => {
        if (!active) return;
        setQrCodeReady(true);
        setQrCodeError("");
      })
      .catch(() => {
        if (!active) return;
        setQrCodeReady(false);
        setQrCodeError(
          "The QR code could not be generated. Use the tracking link instead.",
        );
      });

    return () => {
      active = false;
    };
  }, [confirmation, ticketSettings.allowPublicTicketTracking, ticketSettings.displayTicketOnConfirmation]);

  useEffect(() => {
    if (
      statusLookup.tokenNumber &&
      window.location.hash === "#track-grievance"
    ) {
      window.requestAnimationFrame(() => {
        document.getElementById("track-grievance")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [statusLookup.tokenNumber]);

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateField = (event) => {
    const { checked, name, type, value } = event.target;

    if (name === "has_documents" && value === "no") {
      setFiles([]);
      setFileInputKey((currentKey) => currentKey + 1);
    }

    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "department_id" && current.category_id &&
          !catalog.categories.find((item) => String(item.id) === String(current.category_id))?.departmentIds?.map(String).includes(String(value))) {
        next.category_id = "";
      }

      if (name === "submission_type" && value === "anonymous") {
        next.contact_pref = "";
        next.on_behalf = "";
        next.permission = "";
      }
      if (name === "on_behalf" && value === "no") {
        next.affected_name = "";
        next.relationship = "";
        next.permission = "";
      }
      if (name === "tried_resolve" && value === "no") {
        next.prev_attempts = "";
      }
      if (name === "has_witnesses" && value === "no") {
        next.witness_name = "";
        next.witness_phone = "";
      }

      return next;
    });

    clearFieldError(name);
    setMessage("");
  };

  const updateArrayField = (event) => {
    const { checked, name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: checked
        ? [...current[name], value]
        : current[name].filter((item) => item !== value),
    }));
    clearFieldError(name);
    setMessage("");
  };

  const updateAssistance = (event) => {
    const { checked, value } = event.target;

    setForm((current) => ({
      ...current,
      assistance: checked ? [value] : [],
    }));
    clearFieldError("assistance");
    setMessage("");
  };

  const updateFiles = (event) => {
    setFiles(Array.from(event.target.files || []));
    clearFieldError("attachments");
    setMessage("");
  };

  const removeFile = (indexToRemove) => {
    setFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
    clearFieldError("attachments");
  };

  const getStepErrors = (step) => {
    const errors = {};

    if (step === 1 && !isAnonymous) {
      if (!form.comp_name.trim()) {
        errors.comp_name = "Full name is required.";
      }
      if (
        form.comp_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.comp_email)
      ) {
        errors.comp_email = "Enter a valid email address.";
      }
      if (submissionSettings.mobileNumberRequired && form.comp_phone.replace(/\D/g, "").length < 7) {
        errors.comp_phone = "Enter a mobile number with at least 7 digits.";
      }
      if (submissionSettings.emailAddressRequired && !form.comp_email.trim()) {
        errors.comp_email = "Email is required.";
      }
      if (submissionSettings.identificationNumberRequired && form.identification_number.replace(/[^a-z0-9]/gi, "").length < 4) {
        errors.identification_number = "Enter a valid identification number.";
      }
      if (!form.contact_pref) {
        errors.contact_pref = "Select a preferred contact method.";
      }
      if (
        ["phone", "whatsapp"].includes(form.contact_pref) &&
        form.comp_phone.replace(/\D/g, "").length < 7
      ) {
        errors.comp_phone =
          "Enter a phone number with at least 7 digits for this contact method.";
      }
      if (form.contact_pref === "email" && !form.comp_email.trim()) {
        errors.comp_email = "Email is required for email contact.";
      }
      if (form.contact_pref === "mail" && !form.comp_address.trim()) {
        errors.comp_address = "Address is required for mail contact.";
      }
      if (!form.on_behalf) {
        errors.on_behalf = "Select Yes or No.";
      }
      if (form.on_behalf === "yes") {
        if (!form.affected_name.trim()) {
          errors.affected_name = "Affected person’s name is required.";
        }
        if (!form.relationship.trim()) {
          errors.relationship = "Relationship is required.";
        }
        if (!form.permission) {
          errors.permission = "Select the permission status.";
        }
      }
    }

    if (step === 2) {
      if (!submissionSettings.allowCitizenCategorySelection && !form.issue_other.trim()) {
        errors.issue_type =
          "Select at least one issue type or specify another.";
      }
      if (submissionSettings.allowCitizenCategorySelection && !form.category_id) {
        errors.category_id = "Complaint category is required.";
      }
      if (submissionSettings.allowCitizenDepartmentSelection && !form.department_id) {
        errors.department_id = "Department is required.";
      }
      if (!form.channel.length) {
        errors.channel = "Select at least one contact channel.";
      }
      if (!form.incident_date) {
        errors.incident_date = "Incident date is required.";
      } else if (form.incident_date > getToday()) {
        errors.incident_date = "Incident date cannot be in the future.";
      }
      if (!form.incident_location.trim()) {
        errors.incident_location = "Incident location is required.";
      }
      if (!form.description.trim()) {
        errors.description = "A detailed description is required.";
      } else if (form.description.length > submissionSettings.maximumDescriptionLength) {
        errors.description = `Description must be ${submissionSettings.maximumDescriptionLength} characters or fewer.`;
      }
      if (!form.desired_outcome.trim()) {
        errors.desired_outcome = "Describe the outcome you are seeking.";
      }
      if (!form.tried_resolve) {
        errors.tried_resolve = "Select Yes or No.";
      }
      if (form.tried_resolve === "yes" && !form.prev_attempts.trim()) {
        errors.prev_attempts = "Describe the steps you already took.";
      }
    }

    if (step === 3) {
      if (!form.has_documents) {
        errors.has_documents = "Select Yes or No.";
      }
      if (files.length > maximumFiles) {
        errors.attachments = `You can upload a maximum of ${maximumFiles} file${maximumFiles === 1 ? "" : "s"}.`;
      } else {
        const invalidFile = files.find(
          (file) =>
            !allowedMimeTypes.includes(file.type) ||
            file.size > submissionSettings.maximumAttachmentSizeMb * 1024 * 1024,
        );
        if (invalidFile) {
          errors.attachments =
            `Use ${allowedTypes.join(", ")} files up to ${submissionSettings.maximumAttachmentSizeMb} MB each.`;
        }
      }
      if (!form.has_witnesses) {
        errors.has_witnesses = "Select Yes or No.";
      }
      if (form.has_witnesses === "yes") {
        if (!form.witness_name.trim()) {
          errors.witness_name = "Witness name is required.";
        }
        if (form.witness_phone.replace(/\D/g, "").length < 7) {
          errors.witness_phone =
            "Enter a witness phone number with at least 7 digits.";
        }
      }
    }

    if (step === 4) {
      if ((submissionSettings.displayDeclarationCheckbox || privacySettings.citizenConsentRequired) && !form.declaration_confirm) {
        errors.declaration_confirm = "Confirm the declaration.";
      }
      if (!isAnonymous && !form.signature.trim()) {
        errors.signature = "Electronic signature is required.";
      }
      if (!form.declaration_date) {
        errors.declaration_date = "Declaration date is required.";
      } else if (form.declaration_date > getToday()) {
        errors.declaration_date = "Declaration date cannot be in the future.";
      }
      if (submissionSettings.enableCaptcha && !captchaToken) {
        errors.captchaToken = "Complete the CAPTCHA verification.";
      }
    }

    return errors;
  };

  const scrollToWizard = () => {
    window.requestAnimationFrame(() => {
      wizardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const goToStep = (step) => {
    setActiveStep(Math.min(steps.length, Math.max(1, step)));
    setMessage("");
    scrollToWizard();
  };

  const continueToNextStep = () => {
    const errors = getStepErrors(activeStep);

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setMessage("Please complete the highlighted fields before continuing.");
      return;
    }

    setFieldErrors({});
    goToStep(activeStep + 1);
  };

  const submitGrievance = async (event) => {
    event.preventDefault();

    let firstInvalidStep = null;
    const allErrors = {};

    for (let step = 1; step <= steps.length; step += 1) {
      const stepErrors = getStepErrors(step);
      if (!firstInvalidStep && Object.keys(stepErrors).length) {
        firstInvalidStep = step;
      }
      Object.assign(allErrors, stepErrors);
    }

    if (firstInvalidStep) {
      setFieldErrors(allErrors);
      setMessage("Please complete the highlighted fields before submitting.");
      goToStep(firstInvalidStep);
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => payload.append(key, item));
      } else {
        payload.append(key, value);
      }
    });
    files.forEach((file) => payload.append("attachments", file));
    if (captchaToken) payload.append("captchaToken", captchaToken);

    try {
      setSubmitting(true);
      setMessage("");
      setConfirmation(null);
      setQrCodeReady(false);
      setQrCodeError("");

      const response = await fetch(`${API_BASE_URL}/public/complaints`, {
        method: "POST",
        body: payload,
      });
      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to submit grievance");
      }

      setConfirmation(result.data);
      setForm(createInitialForm(settings.organization.defaultLocation));
      setFiles([]);
      setCaptchaToken("");
      setCaptchaResetVersion((current) => current + 1);
      setFileInputKey((current) => current + 1);
      setFieldErrors({});
      setActiveStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error.message || "Failed to submit grievance");
      setCaptchaToken("");
      setCaptchaResetVersion((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async (event) => {
    event.preventDefault();
    setStatusError("");
    setStatusResult(null);

    const ticketOnly = ticketSettings.trackingVerificationMethod === "Ticket Number Only";
    if (!statusLookup.tokenNumber.trim() || (!ticketOnly && !statusLookup.contactDetail.trim())) {
      setStatusError(ticketOnly ? "Reference number is required." : "Reference number and verification detail are required.");
      return;
    }

    try {
      setStatusLoading(true);
      const response = await fetch(`${API_BASE_URL}/public/complaints/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusLookup),
      });
      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(
          result.message || "Grievance status could not be found",
        );
      }

      setStatusResult(result.data);
    } catch (error) {
      setStatusError(error.message || "Grievance status could not be found");
    } finally {
      setStatusLoading(false);
    }
  };

  const startAnotherGrievance = () => {
    setConfirmation(null);
    setQrCodeReady(false);
    setQrCodeError("");
    setMessage("");
    setActiveStep(1);
    scrollToWizard();
  };

  const fieldError = (field) =>
    fieldErrors[field] ? (
      <small className="grievance-field__error">{fieldErrors[field]}</small>
    ) : null;

  return (
    <main className="grievance-page">
      <section className="subpage-hero subpage-hero--complaint">
        <div className="container subpage-hero__container">
          <p className="section-label">{t("grm")}</p>
          <h1>{t("formTitle")}</h1>
          <p>
            Submit a concern to the Ministry of Human Development, Family
            Support, and Gender Affairs.
          </p>
        </div>
      </section>

      <section className="grievance-portal">
        <div className="container grievance-portal__container">
          <div className="grievance-portal__intro">
            <div>
              <p className="section-label">Accessible · Confidential · Fair</p>
              <h2>Tell us what happened</h2>
              <p>
                Complete the four sections below. Mandatory fields are marked
                with an asterisk.
              </p>
            </div>
            <a className="grievance-help-link" href="#grievance-support">
              <i
                className="fa-regular fa-circle-question"
                aria-hidden="true"
              ></i>
              Support &amp; accessibility
            </a>
          </div>

          <div className="grievance-portal__layout">
            <div className="grievance-wizard" ref={wizardRef}>
              {!submissionSettings.allowPublicSubmission ? (
                <section className="grievance-receipt" role="status">
                  <div className="grievance-receipt__icon"><i className="fa-solid fa-circle-info" /></div>
                  <h2>Public submission is unavailable</h2>
                  <p>The grievance form has been temporarily disabled by the portal administrator.</p>
                </section>
              ) : confirmation ? (
                <section className="grievance-receipt" role="status">
                  <div className="grievance-receipt__icon">
                    <i className="fa-solid fa-check" aria-hidden="true"></i>
                  </div>
                  <p className="grievance-receipt__eyebrow">
                    Submission received
                  </p>
                  <h2>Your grievance has been filed</h2>
                  <p className="grievance-receipt__summary">
                    {ticketSettings.acknowledgementMessage}
                  </p>

                  {ticketSettings.displayTicketOnConfirmation ? <div className="grievance-receipt__code">
                    <span>Your reference number</span>
                    <strong>{confirmation.tokenNumber}</strong>
                    <small>
                      Format: GRM · Year · Month · Sequential number
                    </small>
                  </div> : null}

                  {ticketSettings.displayTicketOnConfirmation && ticketSettings.allowPublicTicketTracking ? <div className="grievance-receipt__tracking">
                    <div className="grievance-receipt__qr">
                      <canvas
                        aria-label={`QR code for grievance ${confirmation.tokenNumber}`}
                        hidden={!qrCodeReady}
                        ref={qrCanvasRef}
                        role="img"
                      ></canvas>
                      {!qrCodeReady ? (
                        <span>
                          <i
                            className="fa-solid fa-qrcode"
                            aria-hidden="true"
                          ></i>
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h3>Scan to track your grievance</h3>
                      <p>
                        The QR code opens the tracking form and fills in
                        reference number {confirmation.tokenNumber}.
                      </p>
                      <a href={buildTrackingPath(confirmation.tokenNumber)}>
                        {t("trackOnline")}
                        <i
                          className="fa-solid fa-arrow-right"
                          aria-hidden="true"
                        ></i>
                      </a>
                      {qrCodeError ? (
                        <small className="grievance-field__error">
                          {qrCodeError}
                        </small>
                      ) : null}
                    </div>
                  </div> : null}

                  <dl className="grievance-receipt__details">
                    <div>
                      <dt>Issue type</dt>
                      <dd>{confirmation.issueSummary}</dd>
                    </div>
                    <div>
                      <dt>Incident location</dt>
                      <dd>{confirmation.incidentLocation}</dd>
                    </div>
                    <div>
                      <dt>Submitted as</dt>
                      <dd>
                        {confirmation.isAnonymous ? "Anonymous" : "Named"}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{confirmation.status}</dd>
                    </div>
                  </dl>

                  <div className="grievance-receipt__next">
                    <h3>What happens next</h3>
                    <p>
                      The grievance will be reviewed and routed to the
                      appropriate team. Named complainants may receive follow-up
                      using their selected contact method.
                    </p>
                  </div>

                  <button
                    className="grievance-button grievance-button--secondary"
                    onClick={startAnotherGrievance}
                    type="button"
                  >
                    {t("another")}
                  </button>
                </section>
              ) : (
                <>
                  <div
                    className="grievance-progress"
                    aria-label="Form progress"
                  >
                    <ol>
                      {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isActive = activeStep === stepNumber;
                        const isComplete = activeStep > stepNumber;

                        return (
                          <li
                            className={[
                              "grievance-progress__step",
                              isActive ? "is-active" : "",
                              isComplete ? "is-complete" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={step.title}
                          >
                            <span
                              className="grievance-progress__circle"
                              aria-current={isActive ? "step" : undefined}
                            >
                              {isComplete ? (
                                <i
                                  className="fa-solid fa-check"
                                  aria-hidden="true"
                                ></i>
                              ) : (
                                stepNumber
                              )}
                            </span>
                            <span className="grievance-progress__copy">
                              <strong>{step.title}</strong>
                              <small>{step.caption}</small>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="grievance-form-card">
                    <div
                      className="grievance-support-banner"
                      id="grievance-support"
                    >
                      <span className="grievance-support-banner__icon">
                        <i
                          className="fa-solid fa-shield-heart"
                          aria-hidden="true"
                        ></i>
                      </span>
                      <div>
                        <h3>
                          Before you begin: support for sensitive grievances
                        </h3>
                        <p>
                          If your grievance concerns abuse, gender-based
                          violence, or another sensitive or distressing matter,
                          you may ask to speak with a trained officer first, and
                          you can be offered counseling or a psychosocial
                          referral before you lodge your complaint. You decide
                          whether to accept this support. It does not delay the
                          handling of your grievance.
                        </p>
                      </div>
                    </div>

                    <form
                      className="grievance-form"
                      noValidate
                      onSubmit={submitGrievance}
                    >
                      <div
                        className={`grievance-step-pane ${
                          activeStep === 1 ? "is-active" : ""
                        }`}
                        aria-hidden={activeStep !== 1}
                      >
                        <div className="grievance-step-pane__header">
                          <span>Step 1 of 4</span>
                          <h2>Submission and complainant</h2>
                          <p>
                            Choose your language support, submission type, and
                            preferred contact details.
                          </p>
                        </div>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>
                              <i
                                className="fa-solid fa-language"
                                aria-hidden="true"
                              ></i>
                            </span>
                            <div>
                              <h3>Language and assistance</h3>
                              <p>
                                Available in English and Spanish, with Maya and
                                Garifuna versions ( in preparation ).
                              </p>
                            </div>
                          </div>
                          <div className="grievance-option-grid grievance-option-grid--three">
                            {assistanceOptions.map((option) => (
                              <OptionTile
                                checked={form.assistance.includes(option.value)}
                                disabled={
                                  form.assistance.length > 0 &&
                                  !form.assistance.includes(option.value)
                                }
                                key={option.value}
                                label={option.label}
                                name="assistance"
                                // note={option.note}
                                onChange={updateAssistance}
                                type="checkbox"
                                value={option.value}
                              />
                            ))}
                          </div>
                          <label className="grievance-field">
                            <span>Other assistance or details</span>
                            <input
                              name="assistance_other"
                              onChange={updateField}
                              placeholder="Describe any other assistance you need"
                              type="text"
                              value={form.assistance_other}
                            />
                          </label>
                        </section>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>A</span>
                            <div>
                              <h3>How are you submitting this grievance?</h3>
                              <p>
                                Anonymous submissions do not include contact
                                details.
                              </p>
                            </div>
                          </div>
                          <div className="grievance-choice-grid">
                            <OptionTile
                              checked={form.submission_type === "named"}
                              label="Named submission"
                              name="submission_type"
                              note="Provide contact details and receive updates."
                              onChange={updateField}
                              value="named"
                            />
                            {submissionSettings.allowAnonymousComplaints ? <OptionTile
                              checked={form.submission_type === "anonymous"}
                              label="Anonymous submission"
                              name="submission_type"
                              note="No contact details or direct updates."
                              onChange={updateField}
                              value="anonymous"
                            /> : null}
                          </div>
                          {isAnonymous ? (
                            <div className="grievance-warning">
                              <i
                                className="fa-solid fa-circle-info"
                                aria-hidden="true"
                              ></i>
                              <p>
                                Your grievance will still be received and acted
                                upon. Without contact details, we cannot send
                                reference updates, ask for more information, or
                                share the outcome directly.
                              </p>
                            </div>
                          ) : null}
                        </section>

                        {!isAnonymous ? (
                          <section className="grievance-form-section-block">
                            <div className="grievance-section-heading">
                              <span>B</span>
                              <div>
                                <h3>Complainant information</h3>
                                <p>Required for named submissions only.</p>
                              </div>
                            </div>

                            <div className="grievance-field-grid">
                              <label className="grievance-field">
                                <span>
                                  Full name <Required />
                                </span>
                                <input
                                  aria-invalid={Boolean(fieldErrors.comp_name)}
                                  autoComplete="name"
                                  name="comp_name"
                                  onChange={updateField}
                                  placeholder="Enter your full name"
                                  type="text"
                                  value={form.comp_name}
                                />
                                {fieldError("comp_name")}
                              </label>
                              <label className="grievance-field">
                                <span>Phone {submissionSettings.mobileNumberRequired ? <Required /> : null}</span>
                                <input
                                  aria-invalid={Boolean(fieldErrors.comp_phone)}
                                  autoComplete="tel"
                                  name="comp_phone"
                                  onChange={updateField}
                                  placeholder="Enter your phone number"
                                  type="tel"
                                  value={form.comp_phone}
                                />
                                {fieldError("comp_phone")}
                              </label>
                              <label className="grievance-field grievance-field--wide">
                                <span>Address</span>
                                <textarea
                                  aria-invalid={Boolean(
                                    fieldErrors.comp_address,
                                  )}
                                  autoComplete="street-address"
                                  name="comp_address"
                                  onChange={updateField}
                                  placeholder="Enter your address"
                                  rows="2"
                                  value={form.comp_address}
                                ></textarea>
                                {fieldError("comp_address")}
                              </label>
                              <label className="grievance-field grievance-field--wide">
                                <span>Email {submissionSettings.emailAddressRequired ? <Required /> : <em>(optional)</em>}</span>
                                <input
                                  aria-invalid={Boolean(fieldErrors.comp_email)}
                                  autoComplete="email"
                                  name="comp_email"
                                  onChange={updateField}
                                  placeholder="Enter your email address"
                                  type="email"
                                  value={form.comp_email}
                                />
                                {fieldError("comp_email")}
                              </label>
                              <label className="grievance-field grievance-field--wide">
                                <span>Identification number {submissionSettings.identificationNumberRequired ? <Required /> : <em>(optional)</em>}</span>
                                <input
                                  aria-invalid={Boolean(fieldErrors.identification_number)}
                                  autoComplete="off"
                                  name="identification_number"
                                  onChange={updateField}
                                  placeholder="Enter your identification number"
                                  type="text"
                                  value={form.identification_number}
                                />
                                <small className="grievance-field__help">Stored encrypted and never displayed in full.</small>
                                {fieldError("identification_number")}
                              </label>
                            </div>

                            <fieldset className="grievance-fieldset">
                              <legend>
                                Preferred contact method <Required />
                              </legend>
                              <div className="grievance-option-grid grievance-option-grid--three">
                                {contactOptions.map((option) => (
                                  <OptionTile
                                    checked={form.contact_pref === option.value}
                                    key={option.value}
                                    label={option.label}
                                    name="contact_pref"
                                    onChange={updateField}
                                    value={option.value}
                                  />
                                ))}
                              </div>
                              {fieldError("contact_pref")}
                            </fieldset>

                            <fieldset className="grievance-fieldset">
                              <legend>
                                Are you submitting on behalf of someone else?{" "}
                                <Required />
                              </legend>
                              <div className="grievance-yes-no">
                                <OptionTile
                                  checked={form.on_behalf === "yes"}
                                  label="Yes"
                                  name="on_behalf"
                                  onChange={updateField}
                                  value="yes"
                                />
                                <OptionTile
                                  checked={form.on_behalf === "no"}
                                  label="No"
                                  name="on_behalf"
                                  onChange={updateField}
                                  value="no"
                                />
                              </div>
                              {fieldError("on_behalf")}
                            </fieldset>

                            {form.on_behalf === "yes" ? (
                              <div className="grievance-conditional-panel">
                                <h4>Affected person details</h4>
                                <div className="grievance-field-grid">
                                  <label className="grievance-field">
                                    <span>
                                      Name of affected person <Required />
                                    </span>
                                    <input
                                      aria-invalid={Boolean(
                                        fieldErrors.affected_name,
                                      )}
                                      name="affected_name"
                                      onChange={updateField}
                                      type="text"
                                      value={form.affected_name}
                                    />
                                    {fieldError("affected_name")}
                                  </label>
                                  <label className="grievance-field">
                                    <span>
                                      Relationship to you <Required />
                                    </span>
                                    <input
                                      aria-invalid={Boolean(
                                        fieldErrors.relationship,
                                      )}
                                      name="relationship"
                                      onChange={updateField}
                                      type="text"
                                      value={form.relationship}
                                    />
                                    {fieldError("relationship")}
                                  </label>
                                </div>
                                <fieldset className="grievance-fieldset">
                                  <legend>
                                    Permission obtained <Required />
                                  </legend>
                                  <div className="grievance-option-grid grievance-option-grid--three">
                                    {[
                                      ["yes", "Yes"],
                                      ["no", "No"],
                                      ["not_applicable", "Not applicable"],
                                    ].map(([value, label]) => (
                                      <OptionTile
                                        checked={form.permission === value}
                                        key={value}
                                        label={label}
                                        name="permission"
                                        onChange={updateField}
                                        value={value}
                                      />
                                    ))}
                                  </div>
                                  {fieldError("permission")}
                                </fieldset>
                              </div>
                            ) : null}
                          </section>
                        ) : null}
                      </div>

                      <div
                        className={`grievance-step-pane ${
                          activeStep === 2 ? "is-active" : ""
                        }`}
                        aria-hidden={activeStep !== 2}
                      >
                        <div className="grievance-step-pane__header">
                          <span>Step 2 of 4</span>
                          <h2>Grievance details</h2>
                          <p>
                            Provide the issue type, channel, incident details,
                            and outcome you are seeking.
                          </p>
                        </div>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>C</span>
                            <div>
                              <h3>Grievance details</h3>
                              <p>Select every issue type that applies.</p>
                            </div>
                          </div>

                          {catalogError ? <div className="grievance-form-message error" role="alert">{catalogError}</div> : null}
                          <div className="grievance-field-grid">
                            {submissionSettings.allowCitizenCategorySelection ? (
                              <label className="grievance-field">
                                <span>Complaint category <Required /></span>
                                <select aria-invalid={Boolean(fieldErrors.category_id)} name="category_id" onChange={updateField} value={form.category_id}>
                                  <option value="">Select a category</option>
                                  {availableCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                {fieldError("category_id")}
                              </label>
                            ) : null}
                            {submissionSettings.allowCitizenDepartmentSelection ? (
                              <label className="grievance-field">
                                <span>Department <Required /></span>
                                <select aria-invalid={Boolean(fieldErrors.department_id)} name="department_id" onChange={updateField} value={form.department_id}>
                                  <option value="">Select a department</option>
                                  {catalog.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                {fieldError("department_id")}
                              </label>
                            ) : null}
                          </div>

                          <label className="grievance-field">
                            <span>{submissionSettings.allowCitizenCategorySelection ? "Additional subject detail" : <>Complaint subject <Required /></>}</span>
                            <input
                              name="issue_other"
                              onChange={updateField}
                              placeholder="Briefly identify the issue"
                              required={!submissionSettings.allowCitizenCategorySelection}
                              type="text"
                              value={form.issue_other}
                            />
                            {fieldError("issue_type")}
                          </label>

                          <fieldset className="grievance-fieldset">
                            <legend>
                              Which channel did you use to reach us?{" "}
                              <Required />
                            </legend>
                            <div className="grievance-option-grid grievance-option-grid--four">
                              {channelOptions.map((option) => (
                                <OptionTile
                                  checked={form.channel.includes(option.value)}
                                  key={option.value}
                                  label={option.label}
                                  name="channel"
                                  onChange={updateArrayField}
                                  type="checkbox"
                                  value={option.value}
                                />
                              ))}
                            </div>
                            {fieldError("channel")}
                          </fieldset>

                          <div className="grievance-field-grid">
                            <label className="grievance-field">
                              <span>
                                Date of incident or issue <Required />
                              </span>
                              <input
                                aria-invalid={Boolean(
                                  fieldErrors.incident_date,
                                )}
                                max={getToday()}
                                name="incident_date"
                                onChange={updateField}
                                type="date"
                                value={form.incident_date}
                              />
                              {fieldError("incident_date")}
                            </label>
                            <label className="grievance-field">
                              <span>
                                Location where it occurred <Required />
                              </span>
                              <input
                                aria-invalid={Boolean(
                                  fieldErrors.incident_location,
                                )}
                                name="incident_location"
                                onChange={updateField}
                                placeholder="Office, district, or location"
                                type="text"
                                value={form.incident_location}
                              />
                              {fieldError("incident_location")}
                            </label>
                            <label className="grievance-field">
                              <span>District or service location</span>
                              <select name="location_id" onChange={updateField} value={form.location_id}>
                                <option value="">Select a location</option>
                                {catalog.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                              </select>
                            </label>
                          </div>

                          <label className="grievance-field">
                            <span>
                              Detailed description <Required />
                            </span>
                            <small className="grievance-field__help">
                              Include relevant names, dates, and specific
                              incidents.
                            </small>
                            <textarea
                              aria-invalid={Boolean(fieldErrors.description)}
                              maxLength={submissionSettings.maximumDescriptionLength}
                              name="description"
                              onChange={updateField}
                              placeholder="Describe what happened in as much detail as possible"
                              rows="6"
                              value={form.description}
                            ></textarea>
                            <small className="grievance-field__help">{form.description.length} / {submissionSettings.maximumDescriptionLength} characters</small>
                            {fieldError("description")}
                          </label>

                          <label className="grievance-field">
                            <span>
                              What outcome are you seeking? <Required />
                            </span>
                            <textarea
                              aria-invalid={Boolean(
                                fieldErrors.desired_outcome,
                              )}
                              name="desired_outcome"
                              onChange={updateField}
                              placeholder="Describe the action or resolution you are requesting"
                              rows="3"
                              value={form.desired_outcome}
                            ></textarea>
                            {fieldError("desired_outcome")}
                          </label>

                          <fieldset className="grievance-fieldset">
                            <legend>
                              Have you tried to resolve this issue before?{" "}
                              <Required />
                            </legend>
                            <div className="grievance-yes-no">
                              <OptionTile
                                checked={form.tried_resolve === "yes"}
                                label="Yes"
                                name="tried_resolve"
                                onChange={updateField}
                                value="yes"
                              />
                              <OptionTile
                                checked={form.tried_resolve === "no"}
                                label="No"
                                name="tried_resolve"
                                onChange={updateField}
                                value="no"
                              />
                            </div>
                            {fieldError("tried_resolve")}
                          </fieldset>

                          {form.tried_resolve === "yes" ? (
                            <div className="grievance-conditional-panel">
                              <label className="grievance-field">
                                <span>
                                  What steps did you take? <Required />
                                </span>
                                <textarea
                                  aria-invalid={Boolean(
                                    fieldErrors.prev_attempts,
                                  )}
                                  name="prev_attempts"
                                  onChange={updateField}
                                  placeholder="Describe who you contacted and what happened"
                                  rows="3"
                                  value={form.prev_attempts}
                                ></textarea>
                                {fieldError("prev_attempts")}
                              </label>
                            </div>
                          ) : null}
                        </section>
                      </div>

                      <div
                        className={`grievance-step-pane ${
                          activeStep === 3 ? "is-active" : ""
                        }`}
                        aria-hidden={activeStep !== 3}
                      >
                        <div className="grievance-step-pane__header">
                          <span>Step 3 of 4</span>
                          <h2>Supporting information</h2>
                          <p>
                            Add documents, witness information, and any
                            accommodations you need.
                          </p>
                        </div>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>D</span>
                            <div>
                              <h3>Supporting information</h3>
                              <p>
                                Documents and witnesses can help the review.
                              </p>
                            </div>
                          </div>

                          <fieldset className="grievance-fieldset">
                            <legend>
                              Do you have documents related to this grievance?{" "}
                              <Required />
                            </legend>
                            <div className="grievance-yes-no">
                              <OptionTile
                                checked={form.has_documents === "yes"}
                                label="Yes"
                                name="has_documents"
                                onChange={updateField}
                                value="yes"
                              />
                              <OptionTile
                                checked={form.has_documents === "no"}
                                label="No"
                                name="has_documents"
                                onChange={updateField}
                                value="no"
                              />
                            </div>
                            {fieldError("has_documents")}
                          </fieldset>

                          {form.has_documents === "yes" ? (
                            <div className="grievance-conditional-panel">
                              <div className="grievance-upload">
                                <div className="grievance-upload__heading">
                                  <h4>Upload supporting documents</h4>
                                  <p>Up to {maximumFiles} file{maximumFiles === 1 ? "" : "s"}, {submissionSettings.maximumAttachmentSizeMb} MB each. {allowedTypes.join(", ")}.</p>
                                </div>
                                <label className="grievance-upload__dropzone">
                                  <input
                                    accept={attachmentAccept}
                                    key={fileInputKey}
                                    multiple={submissionSettings.allowMultipleAttachments}
                                    onChange={updateFiles}
                                    type="file"
                                  />
                                  <span>
                                    <i
                                      className="fa-solid fa-arrow-up-from-bracket"
                                      aria-hidden="true"
                                    ></i>
                                  </span>
                                  <strong>Choose files</strong>
                                  <small>or drag and drop them here</small>
                                </label>
                                {files.length ? (
                                  <div className="grievance-upload__files">
                                    {files.map((file, index) => (
                                      <div
                                        className="grievance-upload__file"
                                        key={`${file.name}-${file.lastModified}`}
                                      >
                                        <i
                                          className="fa-regular fa-file-lines"
                                          aria-hidden="true"
                                        ></i>
                                        <span>
                                          <strong>{file.name}</strong>
                                          <small>
                                            {formatFileSize(file.size)}
                                          </small>
                                        </span>
                                        <button
                                          aria-label={`Remove ${file.name}`}
                                          onClick={() => removeFile(index)}
                                          type="button"
                                        >
                                          <i
                                            className="fa-solid fa-xmark"
                                            aria-hidden="true"
                                          ></i>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {fieldError("attachments")}
                              </div>
                            </div>
                          ) : null}

                          <fieldset className="grievance-fieldset">
                            <legend>
                              Are there any witnesses? <Required />
                            </legend>
                            <div className="grievance-yes-no">
                              <OptionTile
                                checked={form.has_witnesses === "yes"}
                                label="Yes"
                                name="has_witnesses"
                                onChange={updateField}
                                value="yes"
                              />
                              <OptionTile
                                checked={form.has_witnesses === "no"}
                                label="No"
                                name="has_witnesses"
                                onChange={updateField}
                                value="no"
                              />
                            </div>
                            {fieldError("has_witnesses")}
                          </fieldset>

                          {form.has_witnesses === "yes" ? (
                            <div className="grievance-conditional-panel">
                              <div className="grievance-field-grid">
                                <label className="grievance-field">
                                  <span>
                                    Witness name <Required />
                                  </span>
                                  <input
                                    aria-invalid={Boolean(
                                      fieldErrors.witness_name,
                                    )}
                                    name="witness_name"
                                    onChange={updateField}
                                    type="text"
                                    value={form.witness_name}
                                  />
                                  {fieldError("witness_name")}
                                </label>
                                <label className="grievance-field">
                                  <span>
                                    Witness phone <Required />
                                  </span>
                                  <input
                                    aria-invalid={Boolean(
                                      fieldErrors.witness_phone,
                                    )}
                                    name="witness_phone"
                                    onChange={updateField}
                                    type="tel"
                                    value={form.witness_phone}
                                  />
                                  {fieldError("witness_phone")}
                                </label>
                              </div>
                            </div>
                          ) : null}
                        </section>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>E</span>
                            <div>
                              <h3>Special accommodations</h3>
                              <p>
                                Select any support needed to participate in the
                                process.
                              </p>
                            </div>
                          </div>
                          <div className="grievance-option-grid">
                            {accommodationOptions.map((option) => (
                              <OptionTile
                                checked={form.accommodation.includes(
                                  option.value,
                                )}
                                key={option.value}
                                label={option.label}
                                name="accommodation"
                                onChange={updateArrayField}
                                type="checkbox"
                                value={option.value}
                              />
                            ))}
                          </div>
                          <label className="grievance-field">
                            <span>Other accommodation</span>
                            <input
                              name="accommodation_other"
                              onChange={updateField}
                              placeholder="Describe another accommodation"
                              type="text"
                              value={form.accommodation_other}
                            />
                          </label>
                        </section>
                      </div>

                      <div
                        className={`grievance-step-pane ${
                          activeStep === 4 ? "is-active" : ""
                        }`}
                        aria-hidden={activeStep !== 4}
                      >
                        <div className="grievance-step-pane__header">
                          <span>Step 4 of 4</span>
                          <h2>Declaration and submission</h2>
                          <p>
                            Review the declaration, sign electronically, and
                            submit your grievance.
                          </p>
                        </div>

                        <section className="grievance-form-section-block">
                          <div className="grievance-section-heading">
                            <span>F</span>
                            <div>
                              <h3>Declaration</h3>
                              <p>
                                Your rights and responsibilities in the
                                grievance process.
                              </p>
                            </div>
                          </div>

                          <div className="grievance-review">
                            <div>
                              <span>Submission</span>
                              <strong>
                                {isAnonymous ? "Anonymous" : "Named"}
                              </strong>
                            </div>
                            <div>
                              <span>Issue type</span>
                              <strong>
                                {[...selectedIssueLabels, form.issue_other]
                                  .filter(Boolean)
                                  .join(", ") || "Not selected"}
                              </strong>
                            </div>
                            <div>
                              <span>Incident location</span>
                              <strong>
                                {form.incident_location || "Not provided"}
                              </strong>
                            </div>
                            <div>
                              <span>Contact method</span>
                              <strong>
                                {isAnonymous
                                  ? "No direct contact"
                                  : contactOptions.find(
                                      (option) =>
                                        option.value === form.contact_pref,
                                    )?.label || "Not selected"}
                              </strong>
                            </div>
                          </div>

                          <div className="grievance-declaration">
                            <p>{privacySettings.privacyNotice}</p>
                            <p>{privacySettings.termsAndConditions}</p>
                          </div>

                          {submissionSettings.displayDeclarationCheckbox || privacySettings.citizenConsentRequired ? <label
                            className={`grievance-declaration-check ${
                              form.declaration_confirm ? "is-checked" : ""
                            }`}
                          >
                            <input
                              checked={form.declaration_confirm}
                              name="declaration_confirm"
                              onChange={updateField}
                              type="checkbox"
                            />
                            <span>
                              <strong>
                                {submissionSettings.declarationText} <Required />
                              </strong>
                              <small>
                                Checking this box is your electronic
                                confirmation.
                              </small>
                            </span>
                          </label> : null}
                          {submissionSettings.displayDeclarationCheckbox || privacySettings.citizenConsentRequired ? fieldError("declaration_confirm") : null}

                          <div className="grievance-field-grid">
                            {!isAnonymous ? (
                              <label className="grievance-field">
                                <span>
                                  Electronic signature <Required />
                                </span>
                                <input
                                  aria-invalid={Boolean(fieldErrors.signature)}
                                  name="signature"
                                  onChange={updateField}
                                  placeholder="Type your full name"
                                  type="text"
                                  value={form.signature}
                                />
                                {fieldError("signature")}
                              </label>
                            ) : null}
                            <label
                              className={`grievance-field ${
                                isAnonymous ? "grievance-field--wide" : ""
                              }`}
                            >
                              <span>
                                Date <Required />
                              </span>
                              <input
                                aria-invalid={Boolean(
                                  fieldErrors.declaration_date,
                                )}
                                max={getToday()}
                                name="declaration_date"
                                onChange={updateField}
                                type="date"
                                value={form.declaration_date}
                              />
                              {fieldError("declaration_date")}
                            </label>
                          </div>

                          <div className="grievance-office-panel">
                            <div>
                              <h4>For office use only</h4>
                              <p>
                                Completed by the receiving and reviewing
                                officers.
                              </p>
                            </div>
                            <span>Locked</span>
                            <div className="grievance-office-panel__fields">
                              <label>
                                Date received
                                <input disabled placeholder="Auto-generated" />
                              </label>
                              <label>
                                Reference number
                                <input disabled placeholder="Auto-generated" />
                              </label>
                              <label>
                                Received by
                                <input disabled placeholder="Office entry" />
                              </label>
                              <label>
                                Initial classification
                                <select disabled>
                                  <option>Level 1 / 2 / 3 / 4</option>
                                </select>
                              </label>
                              <label className="grievance-field--wide">
                                Assigned to
                                <input disabled placeholder="Office entry" />
                              </label>
                            </div>
                          </div>
                          {submissionSettings.enableCaptcha ? (
                            captcha.ready ? (
                              <>
                                <RecaptchaCheckbox onChange={setCaptchaToken} resetVersion={captchaResetVersion} siteKey={captcha.siteKey} />
                                {fieldError("captchaToken")}
                              </>
                            ) : (
                              <div className="grievance-form__alert" role="alert">CAPTCHA is enabled but not configured. Submission is temporarily unavailable.</div>
                            )
                          ) : null}
                        </section>
                      </div>

                      {message ? (
                        <div className="grievance-form__alert" role="alert">
                          <i
                            className="fa-solid fa-circle-exclamation"
                            aria-hidden="true"
                          ></i>
                          <span>{message}</span>
                        </div>
                      ) : null}

                      <div className="grievance-form__actions">
                        {activeStep > 1 ? (
                          <button
                            className="grievance-button grievance-button--secondary"
                            onClick={() => goToStep(activeStep - 1)}
                            type="button"
                          >
                            <i
                              className="fa-solid fa-arrow-left"
                              aria-hidden="true"
                            ></i>
                            {t("previous")}
                          </button>
                        ) : (
                          <span></span>
                        )}

                        {activeStep < steps.length ? (
                          <button
                            className="grievance-button grievance-button--primary"
                            onClick={continueToNextStep}
                            type="button"
                          >
                            {t("continue")}
                            <i
                              className="fa-solid fa-arrow-right"
                              aria-hidden="true"
                            ></i>
                          </button>
                        ) : (
                          <button
                            className="grievance-button grievance-button--submit"
                            disabled={submitting || (submissionSettings.enableCaptcha && !captcha.ready)}
                            type="submit"
                          >
                            {submitting ? `${t("submit")}…` : t("submit")}
                            <i
                              className="fa-solid fa-paper-plane"
                              aria-hidden="true"
                            ></i>
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>

            {ticketSettings.allowPublicTicketTracking ? <aside className="grievance-tracker" id="track-grievance">
              <div className="grievance-tracker__icon">
                <i
                  className="fa-solid fa-magnifying-glass"
                  aria-hidden="true"
                ></i>
              </div>
              <p className="section-label">{t("track")}</p>
              <h2>{t("checkStatus")}</h2>
              <p>Verification method: {trackingMethod}.</p>

              <form onSubmit={checkStatus}>
                <label>
                  <span>{t("trackingReference")}</span>
                  <input
                    name="tokenNumber"
                    onChange={(event) =>
                      setStatusLookup((current) => ({
                        ...current,
                        tokenNumber: event.target.value,
                      }))
                    }
                    placeholder="GRM-2026-06-0001"
                    type="text"
                    value={statusLookup.tokenNumber}
                  />
                </label>
                {trackingMethod !== "Ticket Number Only" ? <label>
                  <span>{trackingDetailLabels[trackingMethod]}</span>
                  <input
                    name="contactDetail"
                    onChange={(event) =>
                      setStatusLookup((current) => ({
                        ...current,
                        contactDetail: event.target.value,
                      }))
                    }
                    placeholder={trackingDetailLabels[trackingMethod]}
                    type="text"
                    value={statusLookup.contactDetail}
                  />
                </label> : null}
                {statusError ? (
                  <div className="grievance-tracker__error" role="alert">
                    {statusError}
                  </div>
                ) : null}
                <button disabled={statusLoading} type="submit">
                  {statusLoading ? `${t("checkStatus")}…` : t("checkStatus")}
                </button>
              </form>

              {statusResult ? (
                <dl className="grievance-tracker__result">
                  {Object.entries(statusResult).map(([key, value]) => (
                    <div key={key}>
                      <dt>{trackingResultLabels[key] || key}</dt>
                      <dd>{["submittedAt", "updatedAt", "closureDate"].includes(key) && value
                        ? formatPortalDateTime(value, settings.portal, language)
                        : value || "Not provided"}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="grievance-tracker__note">
                <i className="fa-solid fa-lock" aria-hidden="true"></i>
                <span>Your grievance information is handled securely.</span>
              </div>
            </aside> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default SubmitComplaint;
