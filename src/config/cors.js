/**
 * ============================================================
 * FILE: src/config/cors.js
 * PURPOSE: Controls which websites can call our API
 *
 * WHY THIS FILE EXISTS:
 * Without CORS restrictions, ANY website could call our API.
 * We only want our frontend to be able to call our backend.
 *
 * CORS (Cross-Origin Resource Sharing) is a browser security
 * feature. Our server tells browsers:
 * "Only allow requests from these specific domains."
 * ============================================================
 */

// List of domains allowed to call our API
const ALLOWED_ORIGINS = [
  "https://smile-dental-appointment.netlify.app",      // Patient booking form
  "https://smile-dental-dash.netlify.app",             // Staff dashboard
  "http://localhost:3000",                             // Local development
  "http://localhost:5173",                             // Vite dev server
  "http://localhost:8080",                             // Other local dev
];

const corsOptions = {
  // Check if the request origin is in our allowed list
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      // Origin is allowed
      callback(null, true);
    } else {
      // Origin is NOT allowed — block the request
      callback(new Error(`CORS: Origin ${origin} is not allowed`));
    }
  },

  // Which HTTP methods are allowed
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  // Which headers the frontend can send
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],

  // Allow cookies and auth headers to be sent
  credentials: true,

  // Cache preflight response for 24 hours
  // (reduces OPTIONS requests from browser)
  maxAge: 86400,
};

module.exports = { corsOptions, ALLOWED_ORIGINS };
