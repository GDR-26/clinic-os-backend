/**
 * ============================================================
 * FILE: src/controllers/userController.js
 * PURPOSE: Handles HTTP requests for user management
 * ============================================================
 */

const userService = require("../services/userService");
const { validateEmail, validateRole, validateUUID, validateRequired } = require("../utils/validators");
const { sendSuccess, sendError, sendServerError, sendNotFound } = require("../utils/response");
const { getClientIp } = require("../middleware/audit");

/**
 * getUsers - GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const users = await userService.getClinicUsers(req.clinicId);
    sendSuccess(res, "Users retrieved successfully", { users });
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * createUser - POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const { email, fullName, role, phone } = req.body;

    // Validate inputs
    const requiredCheck = validateRequired(req.body, ["email", "fullName", "role"]);
    if (!requiredCheck.valid) return sendError(res, requiredCheck.message);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return sendError(res, emailCheck.message);

    const roleCheck = validateRole(role);
    if (!roleCheck.valid) return sendError(res, roleCheck.message);

    // Prevent creating super_admin through API
    if (role === "super_admin") {
      return sendError(res, "Cannot create super_admin accounts through this endpoint.", 403);
    }

    const user = await userService.createUser({
      email,
      fullName,
      role,
      phone,
      clinicId: req.clinicId,
      createdByUserId: req.user.id,
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "User created successfully. Login credentials sent to their email.", { user }, 201);
  } catch (error) {
    if (error.message.includes("already exists")) {
      return sendError(res, error.message, 409);
    }
    sendServerError(res, error);
  }
};

/**
 * updateUser - PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const idCheck = validateUUID(id);
    if (!idCheck.valid) return sendError(res, idCheck.message);

    const user = await userService.updateUser({
      userId: id,
      updates: req.body,
      updatedByUserId: req.user.id,
      clinicId: req.clinicId,
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "User updated successfully", { user });
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * disableUser - PUT /api/users/:id/disable
 */
const disableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const idCheck = validateUUID(id);
    if (!idCheck.valid) return sendError(res, idCheck.message);

    const user = await userService.disableUser({
      userId: id,
      disabledByUserId: req.user.id,
      clinicId: req.clinicId,
    });

    sendSuccess(res, `${user.full_name}'s account has been disabled.`, { user });
  } catch (error) {
    if (error.message.includes("cannot disable")) {
      return sendError(res, error.message, 403);
    }
    sendServerError(res, error);
  }
};

/**
 * enableUser - PUT /api/users/:id/enable
 */
const enableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userService.enableUser({
      userId: id,
      enabledByUserId: req.user.id,
      clinicId: req.clinicId,
    });

    sendSuccess(res, `${user.full_name}'s account has been enabled.`, { user });
  } catch (error) {
    sendServerError(res, error);
  }
};

module.exports = { getUsers, createUser, updateUser, disableUser, enableUser };
