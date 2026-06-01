const express = require("express");
const areaRoutes = require("./area.routes");
const compareRoutes = require("./compare.routes");
const metaRoutes = require("./meta.routes");
const recommendationRoutes = require("./recommendation.routes");

const router = express.Router();

router.use(metaRoutes);
router.use(recommendationRoutes);
router.use(areaRoutes);
router.use(compareRoutes);

module.exports = router;

