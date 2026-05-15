/**
 * ============================================================
 * FILE: src/routes/auth.js
 * PURPOSE: Defines all authentication API routes
 *
 * WHY THIS FILE EXISTS:
 * Routes connect URLs to controllers.
 * Keeping routes separate from controllers makes it
 * easy to see all available endpoints at a glance.
 *
 * BASE PATH: /api/auth
 * ============================================================
 */

const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { loginRateLimiter, passwordResetRateLimiter } = require("../config/rateLimit");

// ─────────────────────────────────────────
// PUBLIC ROUTES (no login required)
// ─────────────────────────────────────────

// POST /api/auth/login
// Rate limited: 5 attempts per 15 minutes
router.post("/login", loginRateLimiter, authController.login);

// POST /api/auth/refresh
// Get new access token using refresh token
router.post("/refresh", authController.refresh);

// POST /api/auth/forgot-password
// Rate limited: 3 requests per hour
router.post("/forgot-password", passwordResetRateLimiter, authController.forgotPassword);

// POST /api/auth/reset-password
// Reset password using token from email
router.post("/reset-password", authController.resetPassword);

// ─────────────────────────────────────────
// PROTECTED ROUTES (login required)
// ─────────────────────────────────────────

// POST /api/auth/logout
// Invalidates refresh token
router.post("/logout", verifyToken, authController.logout);

// GET /api/auth/me
// Returns current user info
router.get("/me", verifyToken, authController.getMe);

module.exports = router;
