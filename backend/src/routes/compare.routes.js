const express = require("express");
const { compareAreaPair } = require("../controllers/compare.controller");

const router = express.Router();

router.get("/compare", compareAreaPair);

module.exports = router;

