const express = require("express");
const { getServiceMeta } = require("../controllers/meta.controller");
const asyncHandler = require("../middlewares/asyncHandler.middleware");

const router = express.Router();

router.get("/meta", asyncHandler(getServiceMeta));

module.exports = router;
