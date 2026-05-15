/**
 * ============================================================
 * FILE: src/utils/response.js
 * PURPOSE: Consistent API response formatting
 *
 * WHY THIS FILE EXISTS:
 * All API responses should look the same.
 * This makes it easier for the frontend to handle responses.
 *
 * Every response has:
 * { success: true/false, message: "...", data: {...} }
 *
 * Without this, different endpoints might return different formats
 * which makes frontend code messy and error-prone.
 * ============================================================
 */

/**
 * sendSuccess - Sends a successful response
 *
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * sendError - Sends an error response
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message (user-friendly)
 * @param {number} statusCode - HTTP status (default 400)
 * @param {Object} errors - Detailed validation errors (optional)
 */
const sendError = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Include detailed errors if provided (e.g. validation errors)
  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

/**
 * sendUnauthorized - 401 response
 */
const sendUnauthorized = (res, message = "Authentication required.") => {
  sendError(res, message, 401);
};

/**
 * sendForbidden - 403 response
 */
const sendForbidden = (res, message = "You don't have permission to do this.") => {
  sendError(res, message, 403);
};

/**
 * sendNotFound - 404 response
 */
const sendNotFound = (res, resource = "Resource") => {
  sendError(res, `${resource} not found.`, 404);
};

/**
 * sendServerError - 500 response
 * Hides technical details in production
 */
const sendServerError = (res, error) => {
  console.error("Server error:", error);

  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred. Please try again."
      : error.message || "Server error";

  sendError(res, message, 500);
};

module.exports = {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendServerError,
};
