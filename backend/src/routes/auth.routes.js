const express = require("express");
const {
  login,
  me,
  register,
} = require("../controllers/auth.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/auth/register", asyncHandler(register));
router.post("/auth/login", asyncHandler(login));
router.get("/auth/me", requireAuth, me);

module.exports = router;

