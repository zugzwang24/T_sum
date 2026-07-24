const express = require("express");
const tourismRoutes = require("./tourism.routes");
const { getApiInfo } = require("../controllers/apiInfo.controller");
const aiRoutes = require("./ai.routes");
const authRoutes = require("./auth.routes");
const areaRoutes = require("./area.routes");
const comparisonRoutes = require("./comparison.routes");
const compareRoutes = require("./compare.routes");
const metaRoutes = require("./meta.routes");
const recommendationRoutes = require("./recommendation.routes");
const savedAreaRoutes = require("./savedArea.routes");

const router = express.Router();

router.get("/", getApiInfo);
router.use(aiRoutes);
router.use(authRoutes);
router.use(metaRoutes);
router.use(recommendationRoutes);
router.use(savedAreaRoutes);
router.use(comparisonRoutes);
router.use(areaRoutes);
router.use(compareRoutes);
router.use(tourismRoutes);

module.exports = router;
