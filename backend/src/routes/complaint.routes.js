const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission, checkPermission } = require("../middlewares/permission.middleware");
const {
  downloadComplaintAttachment,
  getComplaintById,
  getComplaintNotifications,
  getComplaintOptions,
  getComplaints,
} = require("../controllers/complaint.controller");
const {
  submitAdminComplaint,
} = require("../controllers/public-complaint.controller");
const {
  handleComplaintUpload,
  handleResolutionDocumentUpload,
} = require("../middlewares/complaint-upload.middleware");
const {
  adminComplaintSubmissionLimiter,
  complaintAttachmentDownloadLimiter,
} = require("../middlewares/rate-limit.middleware");
const lifecycle = require("../controllers/lifecycle.controller");

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
router.get("/options", getComplaintOptions);
router.get("/due-date-recalculation/preview", checkPermission("grievances.extend_due_date"), lifecycle.previewDueDateRecalculation);
router.post("/due-date-recalculation/apply", checkPermission("grievances.extend_due_date"), lifecycle.applyDueDateRecalculation);
router.put("/reassignment-requests/:requestId", checkAnyPermission(["grievances.reassign", "grievances.assign"]), lifecycle.decideReassignment);
router.put("/due-date-requests/:requestId", checkAnyPermission(["grievances.extend_due_date", "grievances.close"]), lifecycle.decideDueDate);
router.post(
  "/intake",
  adminComplaintSubmissionLimiter,
  handleComplaintUpload,
  submitAdminComplaint,
);
router.get("/:id/lifecycle", lifecycle.getLifecycle);
router.post("/:id/assignment", checkAnyPermission(["grievances.assign", "grievances.reassign"]), lifecycle.assignComplaint);
router.post("/:id/reassignment", checkAnyPermission(["grievances.request_reassignment", "grievances.reassign"]), lifecycle.reassignComplaint);
router.post("/:id/status", checkAnyPermission(["grievances.update_status", "grievances.submit_resolution", "grievances.approve_resolution", "grievances.close"]), handleResolutionDocumentUpload, lifecycle.changeStatus);
router.post("/:id/comments", checkAnyPermission(["grievances.add_notes", "grievances.update_status"]), lifecycle.addComment);
router.post("/:id/due-date", checkPermission("grievances.extend_due_date"), lifecycle.requestDueDate);
router.get("/:id/resolution-documents/:documentId/download", complaintAttachmentDownloadLimiter, lifecycle.downloadResolutionDocument);
router.get("/:id", getComplaintById);
router.get(
  "/:id/attachments/:attachmentId/download",
  complaintAttachmentDownloadLimiter,
  downloadComplaintAttachment,
);

module.exports = router;
