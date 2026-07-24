const {
  parseTourismRecommendationQuery,
} = require("../schemas/tourism.schema");
const {
  recommendTourismResources,
} = require("../services/tourismRecommendation.service");

function getTourismRecommendations(req, res) {
  const criteria = parseTourismRecommendationQuery(req.query);
  res.json(recommendTourismResources(criteria));
}

module.exports = {
  getTourismRecommendations,
};
