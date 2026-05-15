/**
 * FILE: src/routes/audit.js
 * PURPOSE: View audit logs
 * BASE PATH: /api/audit
 */

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { requireAdmin } = require("../middleware/role");
const { enforceClinicIsolation } = require("../middleware/clinic");
const { sendSuccess, sendServerError } = require("../utils/response");

router.use(requireAdmin);
router.use(enforceClinicIsolation);

// GET /api/audit — Get audit logs with optional filters
router.get("/", async (req, res) => {
  try {
    const {
      action,      // Filter by action type
      startDate,   // Filter by date range
      endDate,
      limit = 50,  // Pagination
      offset = 0,
    } = req.query;

    let query = supabase
      .from("audit_logs")
      .select("*, users(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by clinic (super admin can see all)
    if (req.clinicId) {
      query = query.eq("clinic_id", req.clinicId);
    }

    // Optional filters
    if (action) query = query.eq("action", action);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: logs, error, count } = await query;

    if (error) throw error;

    sendSuccess(res, "Audit logs retrieved", {
      logs,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
