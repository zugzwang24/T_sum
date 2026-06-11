const { compareAreas } = require("../services/dataStore.service");
const { getAreaFeatureRows, resolveCategory } = require("../services/areaFeature.service");
const {
  createHttpError,
  parseCompareQuery,
  validateTimeQuery,
} = require("../schemas/query.schema");

async function compareAreaPair(req, res) {
  validateTimeQuery(req.query);
  const categoryContext = await resolveCategory(req.query.category);

  if (!categoryContext.isValid) {
    if (categoryContext.availableCategories.length === 0) {
      throw createHttpError(
        503,
        "AreaFeature 데이터가 비어 있습니다. 먼저 `npm run db:seed`로 업종별 상권 데이터를 import해주세요."
      );
    }

    throw createHttpError(400, "지원하지 않는 업종입니다.", {
      categories: categoryContext.availableCategories,
    });
  }

  const { areaA, areaB } = parseCompareQuery(req.query);
  const areaRows = await getAreaFeatureRows({
    categoryCode: categoryContext.category.code,
  });
  const result = compareAreas(areaA, areaB, {
    ...req.query,
    industry: categoryContext.category.name,
    __category: categoryContext.category,
    __areas: areaRows,
  });

  if (!result) {
    throw createHttpError(404, "비교할 상권 또는 시간대를 찾을 수 없습니다.");
  }

  res.json(result);
}

module.exports = {
  compareAreaPair,
};
