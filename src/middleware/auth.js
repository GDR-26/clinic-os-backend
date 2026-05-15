/**
 * ============================================================
 * FILE: src/middleware/auth.js
 * PURPOSE: Verifies that the user is logged in (JWT check)
 *
 * WHY THIS FILE EXISTS:
 * Without this middleware, anyone could call our protected
 * API routes without logging in.
 *
 * HOW IT WORKS:
 * 1. Frontend sends request with header: "Authorization: Bearer <token>"
 * 2. This middleware extracts the token
 * 3. Verifies it's valid and not expired
 * 4. Attaches user info to req.user
 * 5. Calls next() to let the request continue
 *
 * WHY JWT?
 * JWT (JSON Web Token) lets us verify user identity without
 * hitting the database on every request. The token itself
 * contains user info, signed with our secret key.
 * ============================================================
 */

const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

/**
 * verifyToken - Checks if user has a valid JWT token
 *
 * Used as middleware on protected routes:
 * router.get('/protected', verifyToken, controller)
 */
const verifyToken = async (req, res, next) => {
  try {
    // ── Step 1: Extract token from Authorization header ──
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in to continue.",
      });
    }

    // Token format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const token = authHeader.split(" ")[1];

    // ── Step 2: Verify token signature and expiry ──
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Token is invalid or expired
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Your session has expired. Please log in again.",
          code: "TOKEN_EXPIRED", // Frontend uses this code to trigger refresh
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
        code: "TOKEN_INVALID",
      });
    }

    // ── Step 3: Check user still exists and is active ──
    // We do this to catch cases where:
    // - User account was disabled after token was issued
    // - User was deleted
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, clinic_id, status, full_name")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please log in again.",
      });
    }

    // Check if account has been disabled
    if (user.status === "disabled") {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been disabled. Please contact your administrator.",
      });
    }

    // ── Step 4: Attach user info to request ──
    // Now any controller can access req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinic_id,
      fullName: user.full_name,
    };

    // Continue to the next middleware/controller
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(500).json({
      success: false,
      message: "Authentication error. Please try again.",
    });
  }
};

/**
 * optionalAuth - Like verifyToken but doesn't fail if no token
 * Used for routes that work for both logged-in and guest users
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token — continue as guest
    req.user = null;
    return next();
  }

  // Has token — verify it
  return verifyToken(req, res, next);
};

module.exports = { verifyToken, optionalAuth };
