const { getRecommendationsWithAi } = require("../services/dataStore.service");
const { getAreaFeatureRows, resolveCategory } = require("../services/areaFeature.service");
const { saveRecommendationRun } = require("../services/recommendationHistory.service");
const { createHttpError, validateTimeQuery } = require("../schemas/query.schema");

async function listRecommendations(req, res) {
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

  if (areaRows.length === 0) {
    throw createHttpError(
      503,
      `AreaFeature 데이터가 비어 있습니다. 먼저 \`npm run db:seed\`로 ${categoryContext.category.label} 업종 데이터를 import해주세요.`
    );
  }

  const result = await getRecommendationsWithAi({
    ...req.query,
    industry: categoryContext.category.name,
    __category: categoryContext.category,
    __areas: areaRows,
  });

  if (!result) {
    throw createHttpError(400, "추천 조건에 맞는 상권 데이터를 만들 수 없습니다.");
  }

  if (req.user) {
    await saveRecommendationRun({
      userId: req.user.id,
      query: req.query,
      result,
    });
  }

  res.json(result);
}

module.exports = {
  listRecommendations,
};
