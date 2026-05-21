/**
 * ============================================================
 * FILE: src/routes/proxy.js
 * PURPOSE: Routes for n8n webhook proxy
 * BASE PATH: /api/proxy
 *
 * TWO TYPES OF ROUTES:
 *
 * PUBLIC (no login needed):
 * → Used by patients on appointments form
 * → Anyone can access
 * → Rate limited to prevent abuse
 *
 * PROTECTED (login required):
 * → Used by staff on dashboard
 * → Requires valid JWT token
 * → Role-based permissions
 * ============================================================
 */

const express = require("express");
const router = express.Router();
const proxyController = require("../controllers/proxyController");
const { verifyToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/role");
const { bookingRateLimiter } = require("../config/rateLimit");

// ─────────────────────────────────────────
// PUBLIC ROUTES — No login required
// Used by patients on appointments form
// ─────────────────────────────────────────

// GET /api/proxy/slots?date=YYYY-MM-DD
router.get("/slots", proxyController.getSlots);

// POST /api/proxy/book
router.post("/book", bookingRateLimiter, proxyController.bookAppointment);

// POST /api/proxy/find
router.post("/find", proxyController.findAppointment);

// POST /api/proxy/reschedule
router.post("/reschedule", proxyController.rescheduleAppointment);

// POST /api/proxy/cancel
router.post("/cancel", bookingRateLimiter, proxyController.cancelAppointment);

// ─────────────────────────────────────────
// PROTECTED ROUTES — Login required
// Used by staff on dashboard
// ─────────────────────────────────────────

// POST /api/proxy/attendance
// Mark appointment attended/not_attended
router.post(
  "/attendance",
  verifyToken,
  requirePermission("MARK_ATTENDANCE"),
  proxyController.markAttendance
);

module.exports = router;

