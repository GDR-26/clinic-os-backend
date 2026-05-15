/**
 * ============================================================
 * FILE: src/index.js
 * PURPOSE: Main entry point for the Smile Dental Backend API
 *
 * WHY THIS FILE EXISTS:
 * This is where our Express server starts. It:
 * - Loads all environment variables
 * - Sets up security middleware (helmet, cors, rate limiting)
 * - Connects all API routes
 * - Starts listening for requests
 *
 * CONNECTS TO:
 * - config/   → loads settings
 * - middleware/ → security layers
 * - routes/   → API endpoints
 * ============================================================
 */

// Load environment variables FIRST before anything else
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

// Import our custom config and routes
const { corsOptions } = require("./config/cors");
const { globalRateLimiter } = require("./config/rateLimit");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const clinicRoutes = require("./routes/clinic");
const apiKeyRoutes = require("./routes/apiKeys");
const proxyRoutes = require("./routes/proxy");
const auditRoutes = require("./routes/audit");

// Import auth middleware — protects routes that need login
const { verifyToken } = require("./middleware/auth");

// ─────────────────────────────────────────
// CREATE EXPRESS APP
// ─────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────
// SECURITY MIDDLEWARE
// These run on EVERY request before it reaches any route
// ─────────────────────────────────────────

// Helmet adds important HTTP security headers automatically
// e.g. prevents clickjacking, XSS, etc.
app.use(helmet());

// CORS — controls which websites can call our API
// Without this, any website could call our backend
app.use(cors(corsOptions));

// Parse incoming JSON request bodies
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent abuse

// Apply global rate limiting to all requests
// Prevents someone from spamming our API
app.use(globalRateLimiter);

// ─────────────────────────────────────────
// HEALTH CHECK ROUTE
// Used by Railway/monitoring to check if server is alive
// ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Smile Dental API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// PUBLIC ROUTES (no login required)
// ─────────────────────────────────────────
app.use("/api/auth", authRoutes); // Login, logout, reset password

// ─────────────────────────────────────────
// PROTECTED ROUTES (login required)
// verifyToken middleware checks JWT before allowing access
// ─────────────────────────────────────────
app.use("/api/users", verifyToken, userRoutes);         // User management
app.use("/api/clinic", verifyToken, clinicRoutes);      // Clinic settings
app.use("/api/keys", verifyToken, apiKeyRoutes);        // API key management
app.use("/api/proxy", verifyToken, proxyRoutes);        // n8n webhook proxy
app.use("/api/audit", verifyToken, auditRoutes);        // Audit logs

// ─────────────────────────────────────────
// 404 HANDLER
// Catches any request that didn't match a route above
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Catches any unhandled errors from routes/controllers
// Always put this LAST
// ─────────────────────────────────────────
app.use((err, req, res, next) => {
  // Log error for debugging (don't expose details to client)
  console.error("Unhandled error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message, // Show real error only in development
  });
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🦷 Smile Dental Backend`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
