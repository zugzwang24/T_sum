const express = require("express");
const {
  getTourismRecommendations,
} = require("../controllers/tourism.controller");

const router = express.Router();

router.get("/tourism/recommendations", getTourismRecommendations);

module.exports = router;
