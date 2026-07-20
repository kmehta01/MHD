const db = require("../config/db");
const AuditLogModel = require("../models/audit-log.model");

const eventDefinitions = {
  PASSWORD_LOGIN_FAILED: { action: "login", verb: "Failed password sign-in" },
  PASSWORD_LOGIN_SUCCEEDED: { action: "login", verb: "Successful password sign-in" },
  TWO_FACTOR_LOCKED: { action: "security", verb: "Locked two-factor verification" },
  TWO_FACTOR_CODE_FAILED: { action: "security", verb: "Failed two-factor verification" },
  TWO_FACTOR_DELIVERY_FAILED: { action: "security", verb: "Failed two-factor code delivery" },
  TWO_FACTOR_CODE_SENT: { action: "security", verb: "Sent two-factor verification code" },
  TWO_FACTOR_CODE_RESENT: { action: "security", verb: "Resent two-factor verification code" },
  TWO_FACTOR_VERIFIED: { action: "security", verb: "Completed two-factor verification" },
  TWO_FACTOR_RECOVERY_CODES_ISSUED: { action: "security", verb: "Issued two-factor recovery codes" },
  TWO_FACTOR_RECOVERY_CODE_USED: { action: "security", verb: "Used a two-factor recovery code" },
  TWO_FACTOR_RECOVERY_CODES_RESET: { action: "security", verb: "Reset recovery codes for admin user" },
  TWO_FACTOR_BREAK_GLASS_RESET: { action: "security", verb: "Used break-glass recovery reset for admin user" },
  ADMIN_USER_CREATED: { action: "create", verb: "Created admin user" },
  ADMIN_USER_UPDATED: { action: "update", verb: "Updated admin user" },
  ADMIN_USER_PASSWORD_UPDATED: { action: "update", verb: "Updated password for admin user" },
  ADMIN_USER_DELETED: { action: "delete", verb: "Deleted admin user" },
  PROFILE_UPDATED: { action: "update", verb: "Updated own profile" },
  PROFILE_PHOTO_UPDATED: { action: "update", verb: "Updated own profile picture" },
  PROFILE_PASSWORD_UPDATED: { action: "security", verb: "Changed own password" },
  ADMIN_GRIEVANCE_CREATED: { action: "create", verb: "Recorded walk-in grievance" },
  ROLE_CREATED: { action: "create", verb: "Created role" },
  ROLE_UPDATED: { action: "update", verb: "Updated role" },
  ROLE_PERMISSIONS_UPDATED: { action: "update", verb: "Updated permissions for role" },
  AUDIT_LOG_EXPORTED: { action: "export", verb: "Exported audit logs" },
};

const getIpAddress = (req) =>
  String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "") || null;

const buildEvent = ({ eventType, resourceType = null, resourceId = null }) => {
  const definition = eventDefinitions[eventType];
  if (!definition) {
    throw new Error(`Unsupported audit event type: ${eventType}`);
  }

  const suffix = resourceId === null || resourceId === undefined
    ? ""
    : ` ID ${resourceId}`;

  return {
    action: definition.action,
    message: `${definition.verb}${suffix}`,
    resourceType,
    resourceId,
  };
};

const recordAuditEvent = async (
  req,
  {
    actorUserId = req.user?.id || null,
    actorSnapshot = null,
    eventType,
    resourceType = null,
    resourceId = null,
    success = true,
  },
  executor = db,
) => {
  const event = buildEvent({ eventType, resourceType, resourceId });
  return AuditLogModel.create(
    {
      actorUserId,
      actorSnapshot,
      eventType,
      ...event,
      success,
      ipAddress: getIpAddress(req),
      userAgent: req.get?.("user-agent") || null,
    },
    executor,
  );
};

const recordAuthEvent = async (
  req,
  { userId = null, actorUserId = null, eventType, success = true },
) => {
  try {
    await recordAuditEvent(req, {
      actorUserId: actorUserId || userId,
      eventType,
      resourceType: userId ? "admin_user" : null,
      resourceId: userId,
      success,
    });
  } catch (error) {
    console.error(`Failed to record auth event ${eventType}:`, error.message);
  }
};

const runAuditedMutation = async (req, event, mutation) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const requestedActorId =
      typeof event === "object" && Object.hasOwn(event, "actorUserId")
        ? event.actorUserId
        : req.user?.id || null;
    let actorSnapshot = null;

    if (requestedActorId) {
      const [actors] = await connection.query(
        `SELECT au.id, au.name, r.slug AS role_slug
         FROM admin_users au
         LEFT JOIN roles r ON r.id = au.role_id
         WHERE au.id = ?
         LIMIT 1`,
        [requestedActorId],
      );
      actorSnapshot = actors[0] || null;
    }

    const result = await mutation(connection);
    const resolvedEvent = typeof event === "function" ? event(result) : event;
    await recordAuditEvent(
      req,
      { ...resolvedEvent, actorSnapshot },
      connection,
    );
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  recordAuditEvent,
  recordAuthEvent,
  runAuditedMutation,
};
