/**
 * FILE: src/routes/clinic.js
 * BASE PATH: /api/clinic
 */

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { enforceClinicIsolation } = require("../middleware/clinic");
const { requireAdmin } = require("../middleware/role");
const { sendSuccess, sendError, sendServerError } = require("../utils/response");
const { createAuditLog, AUDIT_ACTIONS, getClientIp } = require("../middleware/audit");

router.use(enforceClinicIsolation);

// GET /api/clinic — Get current clinic info
router.get("/", async (req, res) => {
  try {
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", req.clinicId)
      .single();

    if (error || !clinic) return sendError(res, "Clinic not found.", 404);
    sendSuccess(res, "Clinic retrieved", { clinic });
  } catch (error) {
    sendServerError(res, error);
  }
});

// PUT /api/clinic/settings — Update clinic settings (admin only)
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    updates.updated_at = new Date().toISOString();

    const { data: clinic, error } = await supabase
      .from("clinics")
      .update(updates)
      .eq("id", req.clinicId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      action: AUDIT_ACTIONS.CLINIC_SETTINGS_CHANGED,
      userId: req.user.id,
      clinicId: req.clinicId,
      details: { changes: updates },
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "Clinic settings updated", { clinic });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
