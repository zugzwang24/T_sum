const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

router.get("/", getHealth);
router.get("/health", getHealth);
router.get("/api/health", getHealth);

module.exports = router;

