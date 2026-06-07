const { createHttpError } = require("../schemas/query.schema");
const {
  AREA_FEATURE_INCLUDE,
  findAreaFeature,
  serializeAreaFeature,
} = require("./areaFeature.service");
const prisma = require("./prisma.service");

const COMPARISON_INCLUDE = {
  items: {
    include: {
      areaFeature: {
        include: AREA_FEATURE_INCLUDE,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
};

function serializeComparisonItem(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    ...serializeAreaFeature(item.areaFeature),
  };
}

function serializeComparison(comparison) {
  return {
    id: comparison.id,
    name: comparison.name,
    createdAt: comparison.createdAt,
    updatedAt: comparison.updatedAt,
    items: (comparison.items || []).map(serializeComparisonItem),
  };
}

async function listComparisons(userId) {
  const comparisons = await prisma.comparison.findMany({
    where: { userId },
    include: COMPARISON_INCLUDE,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return {
    items: comparisons.map(serializeComparison),
  };
}

async function createComparison(userId, { name } = {}) {
  const comparison = await prisma.comparison.create({
    data: {
      userId,
      name: String(name || "").trim() || "내 비교함",
    },
    include: COMPARISON_INCLUDE,
  });

  return {
    item: serializeComparison(comparison),
  };
}

async function getComparison(userId, comparisonId) {
  const comparison = await prisma.comparison.findFirst({
    where: {
      id: comparisonId,
      userId,
    },
    include: COMPARISON_INCLUDE,
  });

  if (!comparison) {
    throw createHttpError(404, "비교함을 찾을 수 없습니다.");
  }

  return {
    item: serializeComparison(comparison),
  };
}

async function addComparisonItem(userId, comparisonId, { areaFeatureId, areaCode }) {
  const comparison = await prisma.comparison.findFirst({
    where: {
      id: comparisonId,
      userId,
    },
  });

  if (!comparison) {
    throw createHttpError(404, "비교함을 찾을 수 없습니다.");
  }

  const areaFeature = await findAreaFeature({ areaFeatureId, areaCode });
  if (!areaFeature) {
    throw createHttpError(404, "비교함에 추가할 상권 데이터를 찾을 수 없습니다.");
  }

  await prisma.comparisonItem.upsert({
    where: {
      comparison_item_identity: {
        comparisonId,
        areaFeatureId: areaFeature.id,
      },
    },
    update: {},
    create: {
      comparisonId,
      areaFeatureId: areaFeature.id,
    },
  });

  await prisma.comparison.update({
    where: { id: comparisonId },
    data: { updatedAt: new Date() },
  });

  return getComparison(userId, comparisonId);
}

async function deleteComparisonItem(userId, comparisonId, itemId) {
  const comparison = await prisma.comparison.findFirst({
    where: {
      id: comparisonId,
      userId,
    },
  });

  if (!comparison) {
    throw createHttpError(404, "비교함을 찾을 수 없습니다.");
  }

  const result = await prisma.comparisonItem.deleteMany({
    where: {
      id: itemId,
      comparisonId,
    },
  });

  if (result.count === 0) {
    throw createHttpError(404, "삭제할 비교 항목을 찾을 수 없습니다.");
  }

  await prisma.comparison.update({
    where: { id: comparisonId },
    data: { updatedAt: new Date() },
  });

  return {
    deleted: true,
    id: itemId,
  };
}

module.exports = {
  addComparisonItem,
  createComparison,
  deleteComparisonItem,
  getComparison,
  listComparisons,
};
