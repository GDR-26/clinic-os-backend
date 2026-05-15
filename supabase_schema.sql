-- ============================================================
-- SMILE DENTAL BACKEND — SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this SQL in Supabase SQL Editor:
-- supabase.com → your project → SQL Editor → New Query
-- Paste this entire file and click Run
-- ============================================================


-- ─────────────────────────────────────────
-- TABLE: clinics
-- Each row = one dental clinic
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  plan        TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: users
-- Staff accounts (admin, doctor, receptionist)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID REFERENCES clinics(id) ON DELETE SET NULL,
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'doctor', 'receptionist')),
  phone               TEXT,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  failed_attempts     INT DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  last_login          TIMESTAMPTZ,
  reset_token_hash    TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: refresh_tokens
-- Stores hashed refresh tokens for JWT rotation
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: api_keys
-- Per-clinic API keys for n8n webhooks
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  rotated_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: audit_logs
-- Tracks all important user actions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES (speeds up common queries)
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_clinic_id ON api_keys(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────
-- SAMPLE DATA (for testing)
-- Run separately after creating tables
-- ─────────────────────────────────────────

-- Create a test clinic
INSERT INTO clinics (id, name, email, phone, address, plan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Smile Dental Clinic',
  'info@smiledental.com',
  '9199999999',
  'Hyderabad, Telangana',
  'starter'
) ON CONFLICT DO NOTHING;

-- Note: Create admin user via the /api/auth/register endpoint
-- or insert directly with a bcrypt hashed password
-- Password: Admin@123 (change immediately!)
-- To generate hash: node -e "const b=require('bcryptjs'); console.log(b.hashSync('Admin@123', 12))"
