const {
  getAreaDetailWithAi,
  searchAreas,
} = require("../services/dataStore.service");
const { getAreaFeatureRows, resolveCategory } = require("../services/areaFeature.service");
const { createHttpError, validateTimeQuery } = require("../schemas/query.schema");

function listAreas(req, res) {
  res.json(searchAreas(req.query.query || req.query.keyword, req.query.limit));
}

async function getAreaDetail(req, res) {
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

  const areaRows = await getAreaFeatureRows({
    categoryCode: categoryContext.category.code,
  });

  const result = await getAreaDetailWithAi(
    req.params.areaCode,
    req.query.time || "evening",
    req.query.ai,
    {
      ...req.query,
      industry: categoryContext.category.name,
      __category: categoryContext.category,
      __areas: areaRows,
    }
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
