const express = require("express");
const {
  getAreaDetail,
  listAreas,
} = require("../controllers/area.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");

const router = express.Router();

router.get("/areas", listAreas);
router.get("/areas/:areaCode", asyncHandler(getAreaDetail));

module.exports = router;

