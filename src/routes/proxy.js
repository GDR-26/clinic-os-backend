// ============================================================
// FILE: src/routes/proxy.js
// PURPOSE: Routes for n8n webhook proxy
// BASE PATH: /api/proxy
// ============================================================

const express = require("express");
const router = express.Router();
const proxyController = require("../controllers/proxyController");
const { enforceClinicIsolation } = require("../middleware/clinic");
const { bookingRateLimiter } = require("../config/rateLimit");

router.use(enforceClinicIsolation);

router.get("/slots", proxyController.getSlots);
router.post("/book", bookingRateLimiter, proxyController.bookAppointment);
router.post("/find", proxyController.findAppointment);
router.post("/reschedule", proxyController.rescheduleAppointment);

module.exports = router;
