const express = require("express");
const { getApiInfo } = require("../controllers/apiInfo.controller");
const areaRoutes = require("./area.routes");
const compareRoutes = require("./compare.routes");
const metaRoutes = require("./meta.routes");
const recommendationRoutes = require("./recommendation.routes");

const router = express.Router();

router.get("/", getApiInfo);
router.use(metaRoutes);
router.use(recommendationRoutes);
router.use(areaRoutes);
router.use(compareRoutes);

module.exports = router;
