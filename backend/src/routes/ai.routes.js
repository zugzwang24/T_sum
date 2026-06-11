const express = require("express");
const {
  createAreaReport,
  createCompareSummary,
  createReliabilityExplanation,
} = require("../controllers/ai.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");

const router = express.Router();

router.post("/ai/area-report", asyncHandler(createAreaReport));
router.post("/ai/compare-summary", asyncHandler(createCompareSummary));
router.post("/ai/reliability-explanation", asyncHandler(createReliabilityExplanation));

module.exports = router;
