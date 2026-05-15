/**
 * ============================================================
 * FILE: src/services/userService.js
 * PURPOSE: Business logic for user management
 *
 * WHY THIS FILE EXISTS:
 * Handles creating, updating, and managing user accounts.
 * Only admins can manage users.
 * Users are always scoped to their clinic.
 * ============================================================
 */

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");
const emailService = require("./emailService");
const { createAuditLog, AUDIT_ACTIONS } = require("../middleware/audit");

/**
 * generateTempPassword - Creates a random temporary password
 */
const generateTempPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * getClinicUsers - Get all users for a clinic
 */
const getClinicUsers = async (clinicId) => {
  const query = supabase
    .from("users")
    .select("id, email, full_name, role, status, last_login, created_at")
    .order("created_at", { ascending: false });

  // super_admin with no clinicId sees all
  if (clinicId) {
    query.eq("clinic_id", clinicId);
  }

  const { data, error } = await query;

  if (error) throw new Error("Failed to fetch users.");
  return data;
};

/**
 * createUser - Creates a new user account
 */
const createUser = async ({ email, fullName, role, phone, clinicId, createdByUserId, ipAddress }) => {
  // Check email not already taken
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  // Generate temporary password
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Create user
  const newUser = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    full_name: fullName,
    role,
    phone: phone || null,
    clinic_id: clinicId,
    status: "active",
    failed_attempts: 0,
    created_at: new Date().toISOString(),
  };

  const { data: user, error } = await supabase
    .from("users")
    .insert(newUser)
    .select("id, email, full_name, role, status")
    .single();

  if (error) throw new Error("Failed to create user.");

  // Send welcome email with temp password
  try {
    await emailService.sendWelcomeEmail({
      to: email,
      name: fullName,
      role,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      tempPassword,
    });
  } catch (emailError) {
    console.error("Welcome email failed:", emailError.message);
    // Don't fail user creation if email fails
  }

  // Audit log
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_CREATED,
    userId: createdByUserId,
    clinicId,
    entityType: "user",
    entityId: user.id,
    details: { email, role, fullName },
  });

  return user;
};

/**
 * updateUser - Updates user details
 */
const updateUser = async ({ userId, updates, updatedByUserId, clinicId, ipAddress }) => {
  const allowedUpdates = ["full_name", "phone", "role"];
  const filteredUpdates = {};

  // Only allow safe fields to be updated
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error("No valid fields to update.");
  }

  filteredUpdates.updated_at = new Date().toISOString();

  const { data: user, error } = await supabase
    .from("users")
    .update(filteredUpdates)
    .eq("id", userId)
    .select("id, email, full_name, role, status")
    .single();

  if (error) throw new Error("Failed to update user.");

  // Audit log
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_UPDATED,
    userId: updatedByUserId,
    clinicId,
    entityType: "user",
    entityId: userId,
    details: { changes: filteredUpdates },
  });

  return user;
};

/**
 * disableUser - Disables a user account
 */
const disableUser = async ({ userId, disabledByUserId, clinicId }) => {
  // Prevent disabling yourself
  if (userId === disabledByUserId) {
    throw new Error("You cannot disable your own account.");
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, email, full_name")
    .single();

  if (error) throw new Error("Failed to disable user.");

  // Invalidate all their refresh tokens (force logout everywhere)
  await supabase.from("refresh_tokens").delete().eq("user_id", userId);

  // Audit log
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_DISABLED,
    userId: disabledByUserId,
    clinicId,
    entityType: "user",
    entityId: userId,
    details: { email: user.email },
  });

  return user;
};

/**
 * enableUser - Re-enables a disabled account
 */
const enableUser = async ({ userId, enabledByUserId, clinicId }) => {
  const { data: user, error } = await supabase
    .from("users")
    .update({
      status: "active",
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, email, full_name")
    .single();

  if (error) throw new Error("Failed to enable user.");

  await createAuditLog({
    action: AUDIT_ACTIONS.USER_ENABLED,
    userId: enabledByUserId,
    clinicId,
    entityType: "user",
    entityId: userId,
    details: { email: user.email },
  });

  return user;
};

module.exports = {
  getClinicUsers,
  createUser,
  updateUser,
  disableUser,
  enableUser,
};
