/**
 * ============================================================
 * FILE: src/config/supabase.js
 * PURPOSE: Creates and exports the Supabase client
 *
 * WHY THIS FILE EXISTS:
 * Supabase is our database. Instead of creating a new
 * connection in every file, we create ONE client here
 * and import it wherever needed.
 *
 * We use the SERVICE KEY (not anon key) because our backend
 * needs full database access (bypasses row-level security).
 * The anon key is for frontend use only.
 * ============================================================
 */

const { createClient } = require("@supabase/supabase-js");

// Validate that required environment variables exist
// Fail fast — better to crash on startup than silently fail later
if (!process.env.SUPABASE_URL) {
  throw new Error("Missing environment variable: SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_KEY");
}

// Create Supabase client with service role key
// Service key = full database access (use only on backend, never on frontend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      // We manage our own auth (JWT), not Supabase auth
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
