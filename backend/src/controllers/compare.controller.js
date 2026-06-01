const { compareAreas } = require("../services/dataStore.service");
const {
  createHttpError,
  parseCompareQuery,
  validateTimeQuery,
} = require("../schemas/query.schema");

function compareAreaPair(req, res) {
  validateTimeQuery(req.query);

  const { areaA, areaB } = parseCompareQuery(req.query);
  const result = compareAreas(areaA, areaB, req.query);

  if (!result) {
    throw createHttpError(404, "비교할 상권 또는 시간대를 찾을 수 없습니다.");
  }

  res.json(result);
}

module.exports = {
  compareAreaPair,
};

