/**
 * ============================================================
 * FILE: src/services/authService.js
 * PURPOSE: All authentication business logic
 *
 * WHY THIS FILE EXISTS:
 * Controllers should only handle HTTP requests/responses.
 * Business logic (like password hashing, token generation)
 * belongs in service files.
 *
 * This separation means:
 * - Easier to test each function independently
 * - Logic can be reused across multiple controllers
 * - Code is cleaner and easier to understand
 *
 * FUNCTIONS:
 * - loginUser: Validates credentials, returns JWT
 * - refreshToken: Issues new JWT using refresh token
 * - logoutUser: Invalidates refresh token
 * - requestPasswordReset: Sends reset email
 * - resetPassword: Updates password with reset token
 * ============================================================
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");
const { createAuditLog, AUDIT_ACTIONS, getClientIp } = require("../middleware/audit");
const emailService = require("./emailService");

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;          // Lock account after 5 failures
const LOCK_DURATION_MINUTES = 30;        // Lock for 30 minutes
const RESET_TOKEN_EXPIRES_HOURS = 1;     // Password reset link valid for 1 hour

/**
 * loginUser - Validates credentials and issues JWT tokens
 *
 * @param {string} email - User's email
 * @param {string} password - Plain text password
 * @param {string} ipAddress - Request IP for audit log
 * @returns {{ user, accessToken, refreshToken }} on success
 */
const loginUser = async (email, password, ipAddress) => {
  // ── Step 1: Find user by email ──
  console.log("Login attempt for email:", email.toLowerCase().trim());

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  console.log("Supabase user found:", user ? "YES" : "NO");
  console.log("Supabase error:", userError?.message || "none");

  // Always log failed attempts (even if user doesn't exist)
  // This prevents "user enumeration" attacks
  if (userError || !user) {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      details: { email, reason: "user_not_found" },
      ipAddress,
    });
    // Return generic message — don't reveal if email exists
    throw new Error("Invalid email or password.");
  }

  // ── Step 2: Check if account is disabled ──
  if (user.status === "disabled") {
    throw new Error("Your account has been disabled. Please contact your administrator.");
  }

  // ── Step 3: Check if account is locked (too many failed attempts) ──
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until) - new Date()) / 60000
    );
    throw new Error(
      `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`
    );
  }

  // ── Step 4: Verify password ──
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  console.log("Password valid:", isPasswordValid);

  if (!isPasswordValid) {
    // Increment failed attempts
    const newFailedAttempts = (user.failed_attempts || 0) + 1;
    const updates = { failed_attempts: newFailedAttempts };

    // Lock account if max attempts reached
    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
      updates.locked_until = lockUntil.toISOString();

      // Log account lockout
      await createAuditLog({
        action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
        userId: user.id,
        clinicId: user.clinic_id,
        details: { failedAttempts: newFailedAttempts },
        ipAddress,
      });
    }

    // Update failed attempts in database
    await supabase.from("users").update(updates).eq("id", user.id);

    // Log failed login
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      userId: user.id,
      clinicId: user.clinic_id,
      details: {
        reason: "wrong_password",
        attemptNumber: newFailedAttempts,
      },
      ipAddress,
    });

    const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
    if (attemptsLeft > 0) {
      throw new Error(
        `Invalid email or password. ${attemptsLeft} attempt(s) remaining before account lock.`
      );
    }
    throw new Error(
      `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`
    );
  }

  // ── Step 5: Reset failed attempts on successful login ──
  await supabase
    .from("users")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login: new Date().toISOString(),
    })
    .eq("id", user.id);

  // ── Step 6: Generate JWT access token ──
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinic_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );

  // ── Step 7: Generate refresh token ──
  const refreshTokenValue = uuidv4();
  const refreshTokenHash = await bcrypt.hash(refreshTokenValue, 10);
  const refreshTokenExpiry = new Date(
    Date.now() +
      parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30) * 24 * 60 * 60 * 1000
  );

  // Store refresh token in database
  await supabase.from("refresh_tokens").insert({
    id: uuidv4(),
    user_id: user.id,
    token_hash: refreshTokenHash,
    expires_at: refreshTokenExpiry.toISOString(),
    created_at: new Date().toISOString(),
  });

  // ── Step 8: Log successful login ──
  await createAuditLog({
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    userId: user.id,
    clinicId: user.clinic_id,
    details: { email: user.email },
    ipAddress,
  });

  // Return user info (without password) and tokens
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      clinicId: user.clinic_id,
    },
    accessToken,
    refreshToken: refreshTokenValue,
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  };
};

/**
 * refreshAccessToken - Issues new JWT using refresh token
 * Called when JWT expires but user is still active
 */
const refreshAccessToken = async (refreshTokenValue) => {
  if (!refreshTokenValue) {
    throw new Error("Refresh token is required.");
  }

  // Get all non-expired refresh tokens
  const { data: tokens, error } = await supabase
    .from("refresh_tokens")
    .select("*, users(*)")
    .gt("expires_at", new Date().toISOString());

  if (error || !tokens || tokens.length === 0) {
    throw new Error("Invalid or expired refresh token.");
  }

  // Find matching token by comparing hash
  let matchedToken = null;
  for (const token of tokens) {
    const isMatch = await bcrypt.compare(refreshTokenValue, token.token_hash);
    if (isMatch) {
      matchedToken = token;
      break;
    }
  }

  if (!matchedToken) {
    throw new Error("Invalid or expired refresh token. Please log in again.");
  }

  const user = matchedToken.users;

  // Check user is still active
  if (user.status === "disabled") {
    throw new Error("Account has been disabled.");
  }

  // Generate new access token
  const newAccessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinic_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );

  // Rotate refresh token (delete old, create new)
  // This is a security best practice — each refresh token can only be used once
  await supabase.from("refresh_tokens").delete().eq("id", matchedToken.id);

  const newRefreshTokenValue = uuidv4();
  const newRefreshTokenHash = await bcrypt.hash(newRefreshTokenValue, 10);
  const newExpiry = new Date(
    Date.now() +
      parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30) * 24 * 60 * 60 * 1000
  );

  await supabase.from("refresh_tokens").insert({
    id: uuidv4(),
    user_id: user.id,
    token_hash: newRefreshTokenHash,
    expires_at: newExpiry.toISOString(),
    created_at: new Date().toISOString(),
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenValue,
  };
};

/**
 * logoutUser - Invalidates refresh token
 */
const logoutUser = async (refreshTokenValue, userId, ipAddress) => {
  if (!refreshTokenValue) return;

  // Get all tokens for this user
  const { data: tokens } = await supabase
    .from("refresh_tokens")
    .select("*")
    .eq("user_id", userId);

  // Find and delete the matching token
  if (tokens) {
    for (const token of tokens) {
      const isMatch = await bcrypt.compare(refreshTokenValue, token.token_hash);
      if (isMatch) {
        await supabase.from("refresh_tokens").delete().eq("id", token.id);
        break;
      }
    }
  }

  // Log logout
  await createAuditLog({
    action: AUDIT_ACTIONS.LOGOUT,
    userId,
    ipAddress,
  });
};

/**
 * requestPasswordReset - Sends password reset email
 */
const requestPasswordReset = async (email, ipAddress) => {
  // Find user (don't reveal if email exists for security)
  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, status")
    .eq("email", email.toLowerCase().trim())
    .single();

  // Log the attempt regardless
  await createAuditLog({
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    userId: user?.id || null,
    details: { email },
    ipAddress,
  });

  // If user doesn't exist, don't reveal it — just return success
  if (!user || user.status === "disabled") return;

  // Generate reset token
  const resetToken = uuidv4();
  const resetTokenHash = await bcrypt.hash(resetToken, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  // Store reset token
  await supabase.from("users").update({
    reset_token_hash: resetTokenHash,
    reset_token_expires: expiresAt.toISOString(),
  }).eq("id", user.id);

  // Send reset email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.full_name,
    resetUrl,
    expiresInHours: RESET_TOKEN_EXPIRES_HOURS,
  });
};

/**
 * resetPassword - Updates password using reset token
 */
const resetPassword = async (email, resetToken, newPassword, ipAddress) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, reset_token_hash, reset_token_expires, status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !user || !user.reset_token_hash) {
    throw new Error("Invalid or expired reset link. Please request a new one.");
  }

  // Check token hasn't expired
  if (new Date(user.reset_token_expires) < new Date()) {
    throw new Error("Reset link has expired. Please request a new one.");
  }

  // Verify reset token
  const isTokenValid = await bcrypt.compare(resetToken, user.reset_token_hash);
  if (!isTokenValid) {
    throw new Error("Invalid reset link. Please request a new one.");
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password and clear reset token
  await supabase.from("users").update({
    password_hash: newPasswordHash,
    reset_token_hash: null,
    reset_token_expires: null,
    failed_attempts: 0,
    locked_until: null,
  }).eq("id", user.id);

  // Invalidate all refresh tokens (forces re-login everywhere)
  await supabase.from("refresh_tokens").delete().eq("user_id", user.id);

  // Log password reset
  await createAuditLog({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    userId: user.id,
    ipAddress,
  });
};

module.exports = {
  loginUser,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  resetPassword,
};
