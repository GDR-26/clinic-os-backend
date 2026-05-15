/**
 * ============================================================
 * FILE: src/utils/validators.js
 * PURPOSE: Reusable input validation functions
 *
 * WHY THIS FILE EXISTS:
 * We validate ALL user inputs before processing them.
 * This prevents:
 * - SQL injection attacks
 * - Invalid data in database
 * - Application crashes from unexpected data
 *
 * Validators return { valid: true/false, message: "..." }
 * so controllers can give clear error messages to users.
 * ============================================================
 */

const validator = require("validator");

/**
 * validateEmail - Checks if email is valid
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email is required." };
  }

  if (!validator.isEmail(email.trim())) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  return { valid: true, message: "" };
};

/**
 * validatePassword - Checks password strength
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: "Password is required." };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: "Password is too long (max 128 characters).",
    };
  }

  // Check for at least one number and one letter
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return {
      valid: false,
      message: "Password must contain at least one letter and one number.",
    };
  }

  return { valid: true, message: "" };
};

/**
 * validatePhone - Validates Indian phone numbers
 * Accepts: 10 digits, with or without country code
 * @param {string} phone
 * @returns {{ valid: boolean, message: string }}
 */
const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, message: "Phone number is required." };
  }

  // Remove all non-digits
  const cleaned = String(phone).replace(/\D/g, "");

  // Accept 10 digits or 12 digits (with 91 country code)
  const isValid =
    (cleaned.length === 10) ||
    (cleaned.length === 12 && cleaned.startsWith("91"));

  if (!isValid) {
    return {
      valid: false,
      message: "Please enter a valid 10-digit Indian phone number.",
    };
  }

  return { valid: true, message: "" };
};

/**
 * validateRole - Checks if role is valid
 * @param {string} role
 * @returns {{ valid: boolean, message: string }}
 */
const validateRole = (role) => {
  const validRoles = ["super_admin", "admin", "doctor", "receptionist"];

  if (!role) {
    return { valid: false, message: "Role is required." };
  }

  if (!validRoles.includes(role)) {
    return {
      valid: false,
      message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
    };
  }

  return { valid: true, message: "" };
};

/**
 * validateUUID - Checks if string is a valid UUID
 * @param {string} id
 * @returns {{ valid: boolean, message: string }}
 */
const validateUUID = (id) => {
  if (!id) {
    return { valid: false, message: "ID is required." };
  }

  if (!validator.isUUID(id)) {
    return { valid: false, message: "Invalid ID format." };
  }

  return { valid: true, message: "" };
};

/**
 * validateDate - Checks if date is valid ISO format
 * @param {string} date
 * @returns {{ valid: boolean, message: string }}
 */
const validateDate = (date) => {
  if (!date) {
    return { valid: false, message: "Date is required." };
  }

  if (!validator.isISO8601(date)) {
    return {
      valid: false,
      message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD or full datetime).",
    };
  }

  return { valid: true, message: "" };
};

/**
 * validateRequired - Checks that all required fields exist
 * @param {Object} body - Request body
 * @param {string[]} fields - Required field names
 * @returns {{ valid: boolean, message: string }}
 */
const validateRequired = (body, fields) => {
  for (const field of fields) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
    ) {
      return {
        valid: false,
        message: `Field '${field}' is required.`,
      };
    }
  }

  return { valid: true, message: "" };
};

/**
 * sanitizeString - Removes dangerous characters from strings
 * @param {string} str
 * @returns {string}
 */
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return "";
  return validator.escape(str.trim());
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRole,
  validateUUID,
  validateDate,
  validateRequired,
  sanitizeString,
};
