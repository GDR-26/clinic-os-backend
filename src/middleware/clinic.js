/**
 * ============================================================
 * FILE: src/middleware/clinic.js
 * PURPOSE: Ensures users only see their own clinic's data
 *
 * WHY THIS FILE EXISTS:
 * This is critical for multi-clinic SaaS security.
 *
 * Problem without this:
 * Clinic A's admin could potentially query Clinic B's data
 * just by changing an ID in the request.
 *
 * Solution:
 * Every database query is automatically filtered by clinic_id.
 * Users can ONLY access data that belongs to THEIR clinic.
 *
 * Exception: super_admin can access all clinics.
 * ============================================================
 */

const { ROLES } = require("./role");

/**
 * enforceClinicIsolation - Adds clinic_id filter to all requests
 *
 * After this middleware runs:
 * - req.clinicId is set to the user's clinic
 * - Controllers use req.clinicId in all DB queries
 * - super_admin can optionally override with ?clinicId=xxx
 */
const enforceClinicIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  // Super admin can access any clinic's data
  // They can pass ?clinicId=xxx to see a specific clinic
  if (req.user.role === ROLES.SUPER_ADMIN) {
    // Use query param if provided, otherwise leave as null (sees all)
    req.clinicId = req.query.clinicId || null;
    req.isSuperAdmin = true;
    return next();
  }

  // All other roles MUST be locked to their own clinic
  if (!req.user.clinicId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not associated with any clinic.",
    });
  }

  // Lock this request to the user's clinic
  req.clinicId = req.user.clinicId;
  req.isSuperAdmin = false;

  next();
};

/**
 * validateClinicAccess - Checks if a resource belongs to user's clinic
 *
 * Used when fetching a specific resource by ID to verify
 * the resource belongs to the user's clinic.
 *
 * @param {string} clinicIdField - Field name containing clinic_id in the resource
 */
const validateClinicAccess = (resourceClinicId, userClinicId, isSuperAdmin) => {
  // Super admin can access anything
  if (isSuperAdmin) return true;

  // Resource must belong to user's clinic
  return resourceClinicId === userClinicId;
};

module.exports = { enforceClinicIsolation, validateClinicAccess };
