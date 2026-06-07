const express = require("express");
const {
  getComparisonById,
  getComparisons,
  postComparison,
  postComparisonItem,
  removeComparisonItem,
} = require("../controllers/comparison.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/comparisons", requireAuth, asyncHandler(getComparisons));
router.post("/comparisons", requireAuth, asyncHandler(postComparison));
router.get("/comparisons/:comparisonId", requireAuth, asyncHandler(getComparisonById));
router.post(
  "/comparisons/:comparisonId/items",
  requireAuth,
  asyncHandler(postComparisonItem)
);
router.delete(
  "/comparisons/:comparisonId/items/:itemId",
  requireAuth,
  asyncHandler(removeComparisonItem)
);

module.exports = router;
