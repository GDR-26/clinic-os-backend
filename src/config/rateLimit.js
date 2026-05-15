/**
 * ============================================================
 * FILE: src/config/rateLimit.js
 * PURPOSE: Limits how many requests a user can make
 *
 * WHY THIS FILE EXISTS:
 * Without rate limiting, someone could:
 * - Spam login 1000 times to guess a password (brute force)
 * - Flood our booking system with fake requests
 * - Crash our server with too many requests (DDoS)
 *
 * We have different limits for different types of requests:
 * - Login: Very strict (5 attempts per 15 mins)
 * - Booking: Moderate (30 per hour)
 * - General: Lenient (100 per minute)
 * ============================================================
 */

const rateLimit = require("express-rate-limit");

// ─────────────────────────────────────────
// GLOBAL RATE LIMITER
// Applied to ALL routes — basic protection
// ─────────────────────────────────────────
const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100,                  // Max 100 requests per minute per IP
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again in a minute.",
  },
  standardHeaders: true,  // Send rate limit info in response headers
  legacyHeaders: false,
});

// ─────────────────────────────────────────
// LOGIN RATE LIMITER
// Very strict — prevents password brute force attacks
// ─────────────────────────────────────────
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5,                    // Max 5 login attempts per 15 mins per IP
  message: {
    success: false,
    message:
      "Too many login attempts from this device. Please wait 15 minutes and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,

  // Skip rate limit for successful requests
  // (We only want to limit FAILED attempts)
  skipSuccessfulRequests: true,
});

// ─────────────────────────────────────────
// BOOKING RATE LIMITER
// Moderate — prevents spam bookings
// ─────────────────────────────────────────
const bookingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 30,                   // Max 30 booking attempts per hour per IP
  message: {
    success: false,
    message: "Too many booking requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─────────────────────────────────────────
// PASSWORD RESET RATE LIMITER
// Strict — prevents email spam
// ─────────────────────────────────────────
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3,                    // Max 3 reset emails per hour per IP
  message: {
    success: false,
    message: "Too many password reset requests. Please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalRateLimiter,
  loginRateLimiter,
  bookingRateLimiter,
  passwordResetRateLimiter,
};
