/**
 * ============================================================
 * FILE: src/middleware/role.js
 * PURPOSE: Controls what each role can do (RBAC)
 *
 * WHY THIS FILE EXISTS:
 * Even after login, not all users should access everything.
 * A receptionist shouldn't manage users.
 * A doctor shouldn't change clinic settings.
 *
 * ROLE HIERARCHY (highest to lowest):
 * super_admin → admin → doctor → receptionist
 *
 * HOW TO USE:
 * router.delete('/users/:id', verifyToken, requireRole(['admin']), controller)
 * ============================================================
 */

// ─────────────────────────────────────────
// ROLE DEFINITIONS
// What each role is allowed to do
// ─────────────────────────────────────────
const ROLES = {
  SUPER_ADMIN: "super_admin", // Platform level — sees ALL clinics
  ADMIN: "admin",             // Clinic level — manages their clinic
  DOCTOR: "doctor",           // View + mark attendance only
  RECEPTIONIST: "receptionist", // View + mark + cancel/reschedule
};

// ─────────────────────────────────────────
// PERMISSIONS MAP
// Lists what each role can do
// ─────────────────────────────────────────
const PERMISSIONS = {
  // Appointment actions
  VIEW_APPOINTMENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  MARK_ATTENDANCE: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  CANCEL_APPOINTMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST],
  RESCHEDULE_APPOINTMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST],

  // User management
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Clinic management
  MANAGE_CLINIC: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_CLINIC: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],

  // API key management
  MANAGE_API_KEYS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Audit logs
  VIEW_AUDIT_LOGS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Super admin only
  MANAGE_ALL_CLINICS: [ROLES.SUPER_ADMIN],
};

/**
 * requireRole - Middleware factory that checks if user has required role
 *
 * @param {string[]} allowedRoles - Array of roles that can access this route
 *
 * Example usage:
 * router.post('/users', verifyToken, requireRole(['admin', 'super_admin']), createUser)
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // verifyToken must run before this middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userRole = req.user.role;

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${allowedRoles.join(", ")}`,
        yourRole: userRole,
      });
    }

    // Role is allowed — continue
    next();
  };
};

/**
 * requirePermission - Checks if user has a specific permission
 *
 * @param {string} permission - Permission key from PERMISSIONS map
 *
 * Example usage:
 * router.delete('/appointments/:id', verifyToken, requirePermission('CANCEL_APPOINTMENT'), controller)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles) {
      // Permission doesn't exist in our map — developer error
      console.error(`Unknown permission: ${permission}`);
      return res.status(500).json({
        success: false,
        message: "Permission configuration error.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action.",
      });
    }

    next();
  };
};

/**
 * requireSuperAdmin - Shortcut for super admin only routes
 */
const requireSuperAdmin = requireRole([ROLES.SUPER_ADMIN]);

/**
 * requireAdmin - Shortcut for admin + super admin routes
 */
const requireAdmin = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

module.exports = {
  ROLES,
  PERMISSIONS,
  requireRole,
  requirePermission,
  requireSuperAdmin,
  requireAdmin,
};
