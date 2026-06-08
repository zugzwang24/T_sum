const express = require("express");
const { compareAreaPair } = require("../controllers/compare.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");

const router = express.Router();

router.get("/compare", asyncHandler(compareAreaPair));

module.exports = router;
