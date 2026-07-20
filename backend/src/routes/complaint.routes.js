const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission } = require("../middlewares/permission.middleware");
const {
  downloadComplaintAttachment,
  getComplaintById,
  getComplaintNotifications,
  getComplaints,
} = require("../controllers/complaint.controller");
const {
  submitAdminComplaint,
} = require("../controllers/public-complaint.controller");
const {
  handleComplaintUpload,
} = require("../middlewares/complaint-upload.middleware");
const {
  adminComplaintSubmissionLimiter,
  complaintAttachmentDownloadLimiter,
} = require("../middlewares/rate-limit.middleware");

const router = express.Router();

router.use(
  verifyToken,
  checkAnyPermission([
    "grievances.view_all",
    "grievances.view_department",
  ]),
);

router.get("/", getComplaints);
router.get("/notifications", getComplaintNotifications);
router.post(
  "/intake",
  adminComplaintSubmissionLimiter,
  handleComplaintUpload,
  submitAdminComplaint,
);
router.get("/:id", getComplaintById);
router.get(
  "/:id/attachments/:attachmentId/download",
  complaintAttachmentDownloadLimiter,
  downloadComplaintAttachment,
);

module.exports = router;
