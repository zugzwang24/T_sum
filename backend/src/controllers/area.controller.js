const {
  getAreaDetailWithAi,
  searchAreas,
} = require("../services/dataStore.service");
const { createHttpError, validateTimeQuery } = require("../schemas/query.schema");

function listAreas(req, res) {
  res.json(searchAreas(req.query.query || req.query.keyword, req.query.limit));
}

async function getAreaDetail(req, res) {
  validateTimeQuery(req.query);

  const result = await getAreaDetailWithAi(
    req.params.areaCode,
    req.query.time || "evening",
    req.query.ai,
    req.query
  );

  if (!result) {
    throw createHttpError(404, "상권 또는 시간대를 찾을 수 없습니다.");
  }

  res.json(result);
}

module.exports = {
  getAreaDetail,
  listAreas,
};

