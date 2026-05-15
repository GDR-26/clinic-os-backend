/**
 * ============================================================
 * FILE: src/middleware/audit.js
 * PURPOSE: Logs important user actions for security & debugging
 *
 * WHY THIS FILE EXISTS:
 * We need to know WHO did WHAT and WHEN.
 *
 * Examples of what we log:
 * - User logged in / failed login attempt
 * - Appointment cancelled / rescheduled
 * - User account created / disabled
 * - API key generated / revoked
 * - Suspicious access attempts
 *
 * We DO NOT log:
 * - Every page view (too noisy)
 * - Dashboard opens
 * - Simple data reads
 *
 * Logs are stored in Supabase audit_logs table.
 * ============================================================
 */

const supabase = require("../config/supabase");

// ─────────────────────────────────────────
// AUDIT ACTION CONSTANTS
// Consistent naming for all logged actions
// ─────────────────────────────────────────
const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: "auth.login_success",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  PASSWORD_RESET_COMPLETED: "auth.password_reset_completed",
  ACCOUNT_LOCKED: "auth.account_locked",
  SUSPICIOUS_ACCESS: "auth.suspicious_access",

  // Appointments
  APPOINTMENT_BOOKED: "appointment.booked",
  APPOINTMENT_RESCHEDULED: "appointment.rescheduled",
  APPOINTMENT_CANCELLED: "appointment.cancelled",
  ATTENDANCE_MARKED: "appointment.attendance_marked",
  NO_SHOW_MARKED: "appointment.no_show_marked",

  // User management
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DISABLED: "user.disabled",
  USER_ENABLED: "user.enabled",
  ROLE_CHANGED: "user.role_changed",

  // API keys
  API_KEY_GENERATED: "api_key.generated",
  API_KEY_REVOKED: "api_key.revoked",
  API_KEY_ROTATED: "api_key.rotated",

  // Settings
  CLINIC_SETTINGS_CHANGED: "clinic.settings_changed",
  INVALID_TOKEN_ATTEMPT: "security.invalid_token",
};

/**
 * createAuditLog - Saves an audit log entry to the database
 *
 * @param {Object} params
 * @param {string} params.action - Action type from AUDIT_ACTIONS
 * @param {string} params.userId - Who performed the action (null if not logged in)
 * @param {string} params.clinicId - Which clinic (null for super admin actions)
 * @param {string} params.entityType - What was affected (appointment, user, etc.)
 * @param {string} params.entityId - ID of the affected item
 * @param {Object} params.details - Extra context (booking ID, old/new values, etc.)
 * @param {string} params.ipAddress - Request IP
 */
const createAuditLog = async ({
  action,
  userId = null,
  clinicId = null,
  entityType = null,
  entityId = null,
  details = {},
  ipAddress = null,
}) => {
  try {
    await supabase.from("audit_logs").insert({
      action,
      user_id: userId,
      clinic_id: clinicId,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log to console but don't crash the app if audit logging fails
    // Audit logs should never break the main flow
    console.error("Failed to create audit log:", error.message);
  }
};

/**
 * getClientIp - Extracts real IP from request
 * Handles cases where server is behind a proxy (like Railway)
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

/**
 * auditMiddleware - Auto-logs sensitive route actions
 *
 * Can be used directly on routes:
 * router.post('/login', auditMiddleware('auth.login_attempt'), controller)
 */
const auditMiddleware = (action) => {
  return (req, res, next) => {
    // Attach audit helper to request so controllers can use it
    req.audit = (extraDetails = {}) => {
      createAuditLog({
        action,
        userId: req.user?.id || null,
        clinicId: req.clinicId || req.user?.clinicId || null,
        details: {
          ...extraDetails,
          userAgent: req.headers["user-agent"],
        },
        ipAddress: getClientIp(req),
      });
    };
    next();
  };
};

module.exports = {
  AUDIT_ACTIONS,
  createAuditLog,
  getClientIp,
  auditMiddleware,
};
