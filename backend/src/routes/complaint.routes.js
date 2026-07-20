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
router.post("/intake", handleComplaintUpload, submitAdminComplaint);
router.get("/:id", getComplaintById);
router.get("/:id/attachments/:attachmentId/download", downloadComplaintAttachment);

module.exports = router;
