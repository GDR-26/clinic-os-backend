/**
 * FILE: src/controllers/proxyController.js
 * PURPOSE: Handles proxied requests to n8n
 */

const n8nService = require("../services/n8nService");
const { validateRequired, validateDate, validatePhone } = require("../utils/validators");
const { sendSuccess, sendError, sendServerError } = require("../utils/response");
const { bookingRateLimiter } = require("../config/rateLimit");
const { createAuditLog, AUDIT_ACTIONS, getClientIp } = require("../middleware/audit");

/**
 * getSlots - GET /api/proxy/slots?date=YYYY-MM-DD
 */
const getSlots = async (req, res) => {
  try {
    const { date } = req.query;

    const dateCheck = validateDate(date);
    if (!dateCheck.valid) return sendError(res, dateCheck.message);

    const result = await n8nService.getAvailableSlots(date, req.clinicId);
    sendSuccess(res, "Slots retrieved", result);
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * bookAppointment - POST /api/proxy/book
 */
const bookAppointment = async (req, res) => {
  try {
    const { name, phone, booking_time, service, mail } = req.body;

    const requiredCheck = validateRequired(req.body, ["name", "phone", "booking_time", "service"]);
    if (!requiredCheck.valid) return sendError(res, requiredCheck.message);

    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) return sendError(res, phoneCheck.message);

    const result = await n8nService.bookAppointment({
      name, phone, booking_time, service, mail: mail || "",
    });

    // Log booking
    await createAuditLog({
      action: AUDIT_ACTIONS.APPOINTMENT_BOOKED,
      userId: req.user?.id || null,
      clinicId: req.clinicId,
      entityType: "appointment",
      entityId: result.bookingId || null,
      details: { name, phone, service, booking_time },
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "Appointment booked successfully", result, 201);
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * findAppointment - POST /api/proxy/find
 */
const findAppointment = async (req, res) => {
  try {
    const { bookingId, phone } = req.body;

    if (!bookingId && !phone) {
      return sendError(res, "Please provide either a Booking ID or phone number.");
    }

    const result = await n8nService.findAppointment(bookingId || "", phone || "");
    sendSuccess(res, "Appointment found", result);
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * rescheduleAppointment - POST /api/proxy/reschedule
 */
const rescheduleAppointment = async (req, res) => {
  try {
    const { bookingId, eventId, new_booking_time, phone, email } = req.body;

    const requiredCheck = validateRequired(req.body, ["bookingId", "eventId", "new_booking_time"]);
    if (!requiredCheck.valid) return sendError(res, requiredCheck.message);

    const result = await n8nService.rescheduleAppointment({
      bookingId, eventId, new_booking_time, phone, email: email || "",
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULED,
      userId: req.user?.id || null,
      clinicId: req.clinicId,
      entityType: "appointment",
      entityId: bookingId,
      details: { bookingId, new_booking_time },
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "Appointment rescheduled successfully", result);
  } catch (error) {
    sendServerError(res, error);
  }
};

/**
 * markAttendance - POST /api/proxy/attendance
 * Called by dashboard to mark attended/not_attended
 * Requires JWT login
 */
const markAttendance = async (req, res) => {
  try {
    const { bookingId, action } = req.body;

    // Validate required fields
    const requiredCheck = validateRequired(req.body, ["bookingId", "action"]);
    if (!requiredCheck.valid) return sendError(res, requiredCheck.message);

    // Only allow valid actions
    if (!["attended", "not_attended"].includes(action)) {
      return sendError(res, "Action must be 'attended' or 'not_attended'");
    }

    // Call n8n mark attendance webhook
    const result = await n8nService.callN8n(
      "mark-attendance",
      "POST",
      { bookingId, action }
    );

    // Log the action
    await createAuditLog({
      action: action === "attended"
        ? AUDIT_ACTIONS.ATTENDANCE_MARKED
        : AUDIT_ACTIONS.NO_SHOW_MARKED,
      userId: req.user.id,
      clinicId: req.user.clinicId,
      entityType: "appointment",
      entityId: bookingId,
      details: { bookingId, action },
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, `Appointment marked as ${action}`, result);
  } catch (error) {
    sendServerError(res, error);
  }
};

module.exports = {
  getSlots,
  bookAppointment,
  findAppointment,
  rescheduleAppointment,
  markAttendance
};
