const express = require("express");
const { getServiceMeta } = require("../controllers/meta.controller");

const router = express.Router();

router.get("/meta", getServiceMeta);

module.exports = router;

