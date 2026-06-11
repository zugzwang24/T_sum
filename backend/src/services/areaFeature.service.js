const prisma = require("./prisma.service");

const DEFAULT_CATEGORY_CODE = "COFFEE_BEVERAGE";
const MULTI_CATEGORY_DATASET_CODE = "SEOUL_MULTI_CATEGORY_AREA_FEATURES_2025";
const COFFEE_CATEGORY_CODES = ["COFFEE_BEVERAGE", "CS100010"];
const CATEGORY_CODE_ALIASES = {
  CAFE: DEFAULT_CATEGORY_CODE,
  COFFEE: DEFAULT_CATEGORY_CODE,
  COFFEE_BEVERAGE: DEFAULT_CATEGORY_CODE,
  KOREAN_FOOD: "CS100001",
  CHINESE_FOOD: "CS100002",
  JAPANESE_FOOD: "CS100003",
  WESTERN_FOOD: "CS100004",
  BAKERY: "CS100005",
  FAST_FOOD: "CS100006",
  CHICKEN: "CS100007",
  SNACK_FOOD: "CS100008",
  CONVENIENCE_STORE: "CS300002",
};

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
      label: true,
    },
  },
  dataset: {
    select: {
      code: true,
      name: true,
    },
  },
};

function serializeCategory(category) {
  if (!category) {
    return null;
  }

  if (COFFEE_CATEGORY_CODES.includes(category.code) || category.name === "커피-음료") {
    return {
      code: DEFAULT_CATEGORY_CODE,
      name: "커피-음료",
      label: "커피-음료",
    };
  }

  return {
    code: category.code,
    name: category.name,
    label: category.label || category.name,
  };
}

function dedupeCategories(categories) {
  const map = new Map();
  categories.forEach((category) => {
    const serialized = serializeCategory(category);
    if (!serialized || map.has(serialized.code)) {
      return;
    }
    map.set(serialized.code, serialized);
  });
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function normalizeCategoryCode(input) {
  const code = String(input || DEFAULT_CATEGORY_CODE).trim();
  if (!code || COFFEE_CATEGORY_CODES.includes(code)) {
    return DEFAULT_CATEGORY_CODE;
  }
  const alias = CATEGORY_CODE_ALIASES[code.toUpperCase()];
  if (alias) {
    return alias;
  }
  return code;
}

function getLookupCategoryCodes(categoryCode) {
  return categoryCode === DEFAULT_CATEGORY_CODE ? COFFEE_CATEGORY_CODES : [categoryCode];
}

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
    __category: serializeCategory(areaFeature.businessCategory),
  };
}

async function listAvailableCategories() {
  const categories = await prisma.businessCategory.findMany({
    where: {
      areaFeatures: {
        some: {},
      },
    },
    select: {
      code: true,
      name: true,
      label: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  return dedupeCategories(categories);
}

async function resolveCategory(input) {
  const code = normalizeCategoryCode(input);
  const availableCategories = await listAvailableCategories();
  const category = availableCategories.find((item) => item.code === code) || null;

  return {
    category,
    availableCategories,
    isValid: Boolean(category),
  };
}

async function getAreaFeatureRows({ categoryCode = DEFAULT_CATEGORY_CODE } = {}) {
  const lookupCodes = getLookupCategoryCodes(normalizeCategoryCode(categoryCode));
  const baseWhere = {
    businessCategory: {
      code: {
        in: lookupCodes,
      },
    },
  };

  const findRows = (where) =>
    prisma.areaFeature.findMany({
      where,
      include: {
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
            label: true,
          },
        },
      },
      orderBy: {
        district: {
          code: "asc",
        },
      },
    });

  const areaFeatures = await prisma.areaFeature.findMany({
    where: {
      ...baseWhere,
      dataset: {
        code: MULTI_CATEGORY_DATASET_CODE,
      },
    },
    include: {
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
          label: true,
        },
      },
    },
    orderBy: {
      district: {
        code: "asc",
      },
    },
  });

  if (areaFeatures.length > 0) {
    return areaFeatures.map(toAreaRow);
  }

  return (await findRows(baseWhere)).map(toAreaRow);
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
          ...serializeCategory(areaFeature.businessCategory),
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
  DEFAULT_CATEGORY_CODE,
  findAreaFeature,
  getAreaFeatureRows,
  listAvailableCategories,
  resolveCategory,
  serializeAreaFeature,
  serializeCategory,
};
