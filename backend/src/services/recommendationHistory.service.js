const prisma = require("./prisma.service");

function compactQuery(query = {}) {
  return Object.fromEntries(
    Object.entries(query).filter(([key]) => !key.startsWith("__"))
  );
}

function toNullableNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function saveRecommendationRun({ userId, query, result }) {
  if (!userId || !result) {
    return null;
  }

  const items = Array.isArray(result.items) ? result.items : [];
  const itemsWithAreaFeature = items.filter((item) => item.areaFeatureId);

  return prisma.recommendationRun.create({
    data: {
      userId,
      query: compactQuery(query),
      criteria: result.criteria || null,
      resultCount: items.length,
      results: {
        create: itemsWithAreaFeature.map((item) => ({
          areaFeatureId: item.areaFeatureId,
          rank: item.rank,
          score: toNullableNumber(item.score),
          baseScore: toNullableNumber(item.baseScore),
          recommendationTier: item.recommendationTier || null,
          data: item,
        })),
      },
    },
  });
}

module.exports = {
  saveRecommendationRun,
};
