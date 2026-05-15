/**
 * FILE: src/routes/apiKeys.js
 * PURPOSE: Manage per-clinic API keys for n8n webhooks
 * BASE PATH: /api/keys
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { requireAdmin } = require("../middleware/role");
const { enforceClinicIsolation } = require("../middleware/clinic");
const { sendSuccess, sendError, sendServerError } = require("../utils/response");
const { createAuditLog, AUDIT_ACTIONS, getClientIp } = require("../middleware/audit");

router.use(requireAdmin);
router.use(enforceClinicIsolation);

/**
 * Generates a readable API key format: SDK-XXXXXXXX-XXXX-XXXX
 */
const generateApiKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SDK-${segment(8)}-${segment(4)}-${segment(4)}`;
};

// GET /api/keys — List all keys for clinic
router.get("/", async (req, res) => {
  try {
    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, status, created_at, rotated_at")
      .eq("clinic_id", req.clinicId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Note: We never return the actual key value — only metadata
    sendSuccess(res, "API keys retrieved", { keys });
  } catch (error) {
    sendServerError(res, error);
  }
});

// POST /api/keys — Generate new API key
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Key name is required.");

    const rawKey = generateApiKey();
    const keyHash = await bcrypt.hash(rawKey, 10);

    const { data: key, error } = await supabase
      .from("api_keys")
      .insert({
        id: uuidv4(),
        clinic_id: req.clinicId,
        name,
        key_hash: keyHash,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select("id, name, status, created_at")
      .single();

    if (error) throw error;

    await createAuditLog({
      action: AUDIT_ACTIONS.API_KEY_GENERATED,
      userId: req.user.id,
      clinicId: req.clinicId,
      entityType: "api_key",
      entityId: key.id,
      details: { name },
      ipAddress: getClientIp(req),
    });

    // Return the raw key ONCE — it can't be retrieved again
    sendSuccess(
      res,
      "API key generated. Copy it now — it will not be shown again.",
      { key: { ...key, rawKey } },
      201
    );
  } catch (error) {
    sendServerError(res, error);
  }
});

// DELETE /api/keys/:id — Revoke API key
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("api_keys")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("clinic_id", req.clinicId);

    if (error) throw error;

    await createAuditLog({
      action: AUDIT_ACTIONS.API_KEY_REVOKED,
      userId: req.user.id,
      clinicId: req.clinicId,
      details: { keyId: id },
      ipAddress: getClientIp(req),
    });

    sendSuccess(res, "API key revoked successfully.");
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
