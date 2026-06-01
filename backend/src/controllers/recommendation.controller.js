const { getRecommendationsWithAi } = require("../services/dataStore.service");
const { validateTimeQuery } = require("../schemas/query.schema");

async function listRecommendations(req, res) {
  validateTimeQuery(req.query);
  res.json(await getRecommendationsWithAi(req.query));
}

module.exports = {
  listRecommendations,
};

