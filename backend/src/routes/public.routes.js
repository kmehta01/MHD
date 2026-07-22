const express = require("express");
const {
  handleComplaintUpload,
} = require("../middlewares/complaint-upload.middleware");
const {
  getComplaintStatus,
  submitComplaint,
} = require("../controllers/public-complaint.controller");
const {
  complaintStatusLookupLimiter,
  publicComplaintSubmissionLimiter,
} = require("../middlewares/rate-limit.middleware");
const { getPublicSettings } = require("../controllers/public-settings.controller");
const { getPublicCatalog } = require("../controllers/configuration.controller");
const { getPublicDirectory } = require("../controllers/site-directory.controller");
const {
  enforcePublicSubmission,
  enforcePublicTracking,
} = require("../middlewares/public-policy.middleware");

const router = express.Router();
router.get("/settings", getPublicSettings);
router.get("/catalog", getPublicCatalog);
router.get("/site-directory", getPublicDirectory);
router.post(
  "/complaints",
  publicComplaintSubmissionLimiter,
  enforcePublicSubmission,
  handleComplaintUpload,
  submitComplaint,
);
router.post(
  "/complaints/status",
  complaintStatusLookupLimiter,
  enforcePublicTracking,
  getComplaintStatus,
);

module.exports = router;
