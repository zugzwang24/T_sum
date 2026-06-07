const express = require("express");
const {
  createSavedArea,
  getSavedAreas,
  removeSavedArea,
} = require("../controllers/savedArea.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/saved-areas", requireAuth, asyncHandler(getSavedAreas));
router.post("/saved-areas", requireAuth, asyncHandler(createSavedArea));
router.delete("/saved-areas/:id", requireAuth, asyncHandler(removeSavedArea));

module.exports = router;
