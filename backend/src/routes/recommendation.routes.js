const express = require("express");
const { listRecommendations } = require("../controllers/recommendation.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");

const router = express.Router();

router.get("/recommendations", asyncHandler(listRecommendations));
router.get("/recommend", asyncHandler(listRecommendations));

module.exports = router;

