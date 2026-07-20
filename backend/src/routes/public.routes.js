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

const router = express.Router();
router.post(
  "/complaints",
  publicComplaintSubmissionLimiter,
  handleComplaintUpload,
  submitComplaint,
);
router.post(
  "/complaints/status",
  complaintStatusLookupLimiter,
  getComplaintStatus,
);

module.exports = router;
