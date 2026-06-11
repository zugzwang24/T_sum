const express = require("express");
const { listRecommendations } = require("../controllers/recommendation.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");
const { optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/recommendations", optionalAuth, asyncHandler(listRecommendations));
router.get("/recommend", optionalAuth, asyncHandler(listRecommendations));

module.exports = router;
