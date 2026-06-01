const express = require("express");
const apiRoutes = require("./api.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use(healthRoutes);
router.use("/api", apiRoutes);

module.exports = router;

