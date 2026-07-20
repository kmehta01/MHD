const express = require("express");
const {
  handleComplaintUpload,
} = require("../middlewares/complaint-upload.middleware");
const {
  getComplaintStatus,
  submitComplaint,
} = require("../controllers/public-complaint.controller");

const router = express.Router();
router.post("/complaints", handleComplaintUpload, submitComplaint);
router.post("/complaints/status", getComplaintStatus);

module.exports = router;
