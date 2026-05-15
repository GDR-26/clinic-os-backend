/**
 * ============================================================
 * FILE: src/controllers/authController.js
 * PURPOSE: Handles HTTP requests for authentication
 *
 * WHY THIS FILE EXISTS:
 * Controllers only handle:
 * - Reading request data
 * - Calling the right service
 * - Sending the response
 *
 * Business logic is in authService.js
 * This separation makes code easier to test and maintain.
 * ============================================================
 */

const authService = require("../services/authService");
const { validateEmail, validatePassword, validateRequired } = require("../utils/validators");
const { sendSuccess, sendError, sendServerError } = require("../utils/response");
const { getClientIp } = require("../middleware/audit");

/**
 * login - POST /api/auth/login
 * Validates credentials and returns JWT tokens
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validate inputs ──
    const requiredCheck = validateRequired(req.body, ["email", "password"]);
    if (!requiredCheck.valid) {
      return sendError(res, requiredCheck.message);
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return sendError(res, emailCheck.message);
    }

    // ── Call auth service ──
    const result = await authService.loginUser(
      email,
      password,
      getClientIp(req)
    );

    // ── Send response ──
    sendSuccess(res, "Login successful", {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    // Auth errors (wrong password, locked account) are 401
    // System errors are 500
    const statusCode = error.message.includes("locked") ||
      error.message.includes("Invalid") ||
      error.message.includes("disabled")
      ? 401
      : 500;

    sendError(res, error.message, statusCode);
  }
};

/**
 * refresh - POST /api/auth/refresh
 * Issues new access token using refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, "Refresh token is required.");
    }

    const result = await authService.refreshAccessToken(refreshToken);

    sendSuccess(res, "Token refreshed successfully", {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    sendError(res, error.message, 401);
  }
};

/**
 * logout - POST /api/auth/logout
 * Invalidates refresh token
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    await authService.logoutUser(refreshToken, userId, getClientIp(req));

    sendSuccess(res, "Logged out successfully");
  } catch (error) {
    // Always return success for logout (even if token was already invalid)
    sendSuccess(res, "Logged out successfully");
  }
};

/**
 * forgotPassword - POST /api/auth/forgot-password
 * Sends password reset email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return sendError(res, emailCheck.message);
    }

    await authService.requestPasswordReset(email, getClientIp(req));

    // Always return success — don't reveal if email exists
    sendSuccess(
      res,
      "If an account exists with this email, you will receive a reset link shortly."
    );
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * resetPassword - POST /api/auth/reset-password
 * Updates password using reset token
 */
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // Validate inputs
    const requiredCheck = validateRequired(req.body, ["email", "token", "newPassword"]);
    if (!requiredCheck.valid) {
      return sendError(res, requiredCheck.message);
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return sendError(res, emailCheck.message);
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return sendError(res, passwordCheck.message);
    }

    await authService.resetPassword(
      email,
      token,
      newPassword,
      getClientIp(req)
    );

    sendSuccess(
      res,
      "Password reset successfully. Please log in with your new password."
    );
  } catch (error) {
    sendError(res, error.message, 400);
  }
};

/**
 * getMe - GET /api/auth/me
 * Returns current logged-in user info
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    sendSuccess(res, "User info retrieved", { user: req.user });
  } catch (error) {
    sendServerError(res, error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
