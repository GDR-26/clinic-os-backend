/**
 * FILE: src/routes/users.js
 * BASE PATH: /api/users (all require login)
 */

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAdmin } = require("../middleware/role");
const { enforceClinicIsolation } = require("../middleware/clinic");

// All user routes require admin role + clinic isolation
router.use(requireAdmin);
router.use(enforceClinicIsolation);

router.get("/", userController.getUsers);           // GET all users
router.post("/", userController.createUser);        // POST create user
router.put("/:id", userController.updateUser);      // PUT update user
router.put("/:id/disable", userController.disableUser); // PUT disable
router.put("/:id/enable", userController.enableUser);   // PUT enable

module.exports = router;
