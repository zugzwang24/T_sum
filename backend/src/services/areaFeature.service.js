const prisma = require("./prisma.service");

const AREA_FEATURE_INCLUDE = {
  district: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  businessCategory: {
    select: {
      code: true,
      name: true,
    },
  },
  dataset: {
    select: {
      code: true,
      name: true,
    },
  },
};

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toAreaRow(areaFeature) {
  return {
    ...(areaFeature.rawFeatures || {}),
    __areaFeatureId: areaFeature.id,
    __districtId: areaFeature.districtId,
  };
}

async function getAreaFeatureRows() {
  const areaFeatures = await prisma.areaFeature.findMany({
    include: {
      district: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: {
      district: {
        code: "asc",
      },
    },
  });

  return areaFeatures.map(toAreaRow);
}

async function findAreaFeature({ areaFeatureId, areaCode }) {
  if (areaFeatureId) {
    return prisma.areaFeature.findUnique({
      where: { id: areaFeatureId },
      include: AREA_FEATURE_INCLUDE,
    });
  }

  if (areaCode) {
    return prisma.areaFeature.findFirst({
      where: {
        district: {
          code: String(areaCode),
        },
      },
      include: AREA_FEATURE_INCLUDE,
    });
  }

  return null;
}

function serializeAreaFeature(areaFeature) {
  const raw = areaFeature.rawFeatures || {};

  return {
    areaFeatureId: areaFeature.id,
    districtId: areaFeature.districtId,
    areaCode: areaFeature.district?.code || raw["행정동_코드"] || null,
    areaName: areaFeature.district?.name || raw["행정동_코드_명"] || null,
    businessCategory: areaFeature.businessCategory
      ? {
          code: areaFeature.businessCategory.code,
          name: areaFeature.businessCategory.name,
        }
      : null,
    dataset: areaFeature.dataset
      ? {
          code: areaFeature.dataset.code,
          name: areaFeature.dataset.name,
        }
      : null,
    metrics: {
      monthlySalesAmount:
        areaFeature.monthlySalesAmount ?? toNullableNumber(raw["당월_매출_금액"]),
      monthlySalesCount:
        areaFeature.monthlySalesCount ?? toNullableNumber(raw["당월_매출_건수"]),
      totalSalesCount: areaFeature.totalSalesCount ?? toNullableNumber(raw["총매출건수"]),
      targetSalesRatio: areaFeature.targetSalesRatio ?? toNullableNumber(raw["2030_매출비율"]),
      targetFootTraffic:
        areaFeature.targetFootTraffic ?? toNullableNumber(raw["2030_유동인구"]),
      targetFootTrafficRatio:
        areaFeature.targetFootTrafficRatio ?? toNullableNumber(raw["2030_유동인구비율"]),
      cafeConversionRate:
        areaFeature.cafeConversionRate ?? toNullableNumber(raw["카페전환효율"]),
      averageTicket: areaFeature.averageTicket ?? toNullableNumber(raw["객단가"]),
      recommendedTimeBand:
        areaFeature.recommendedTimeBand || raw["시간대추천"] || null,
    },
  };
}

module.exports = {
  AREA_FEATURE_INCLUDE,
  findAreaFeature,
  getAreaFeatureRows,
  serializeAreaFeature,
};
