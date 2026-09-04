/**
 * ============================================================
 * FILE: src/routes/dashboard.js
 * PURPOSE: Proxies dashboard booking data from n8n, keeping the
 * n8n webhook URL and secret token entirely server-side.
 *
 * WHY THIS FILE EXISTS:
 * Previously, the dashboard frontend called the n8n webhook
 * directly from the browser, using a token that came from
 * /api/clinic. That meant the secret token (and the webhook
 * URL) were visible to anyone with DevTools open — no login
 * required to reuse them.
 *
 * This route fixes that: the frontend now calls THIS backend
 * route (which DOES require a valid JWT), and the backend
 * fetches from n8n on the frontend's behalf. The token never
 * reaches the browser.
 *
 * BASE PATH: /api/dashboard-data
 * ============================================================
 */

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { verifyToken } = require("../middleware/auth");
const { enforceClinicIsolation } = require("../middleware/clinic");
const { sendSuccess, sendError, sendServerError } = require("../utils/response");

// GET /api/dashboard-data — fetch this clinic's live booking data via n8n
router.get("/", verifyToken, enforceClinicIsolation, async (req, res) => {
  try {
    if (!req.clinicId) {
      return sendError(res, "No clinic selected.", 400);
    }

    // Look up this clinic's webhook URL + token — server-side only,
    // using the service role key, never sent to the browser.
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("dashboard_webhook_url, dashboard_token")
      .eq("id", req.clinicId)
      .single();

    if (error || !clinic) {
      return sendError(res, "Clinic not found.", 404);
    }

    const { dashboard_webhook_url: webhookUrl, dashboard_token: token } = clinic;

    if (!webhookUrl || !token) {
      // No webhook configured yet for this clinic — let the frontend
      // fall back to sample data instead of erroring.
      return sendSuccess(res, "No dashboard webhook configured", { records: [], configured: false });
    }

    const n8nResponse = await fetch(webhookUrl, {
      headers: { "X-Dashboard-Token": token },
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      throw new Error(`n8n error (${n8nResponse.status}): ${errorText}`);
    }

    const records = await n8nResponse.json();

    sendSuccess(res, "Dashboard data retrieved", { records, configured: true });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;  