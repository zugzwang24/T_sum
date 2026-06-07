const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { parse } = require("csv-parse/sync");

const prisma = new PrismaClient();

const CATEGORY = {
  code: "COFFEE_BEVERAGE",
  name: "커피-음료",
};

const DATASET = {
  code: "SEOUL_CAFE_AREA_FEATURES_2025",
  name: "2025 서울 카페 상권 feature",
  description: "data_analysis/data/processed/cafe_area_features.csv 기반 상권 추천 feature 데이터",
};

const DEFAULT_DATA_PATH = "../data_analysis/data/processed/cafe_area_features.csv";

function resolveCsvPath() {
  const configuredPath = process.env.DATA_PATH || DEFAULT_DATA_PATH;

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(__dirname, "..", configuredPath);
}

function toNullableNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function buildAreaFeatureData(row) {
  return {
    monthlySalesAmount: toNullableNumber(row["당월_매출_금액"]),
    monthlySalesCount: toNullableNumber(row["당월_매출_건수"]),
    totalSalesCount: toNullableNumber(row["총매출건수"]),
    targetSalesCount: toNullableNumber(row["2030_매출건수"]),
    peakTimeSalesRatio: toNullableNumber(row["피크타임_매출비중"]),
    recommendedTimeBand: toNullableString(row["시간대추천"]),
    quarterlySalesStability: toNullableNumber(row["분기별_매출안정성"]),
    targetSalesRatio: toNullableNumber(row["2030_매출비율"]),
    averageTicket: toNullableNumber(row["객단가"]),
    dawnSalesRatio: toNullableNumber(row["새벽_매출비중"]),
    morningSalesRatio: toNullableNumber(row["오전_매출비중"]),
    lunchSalesRatio: toNullableNumber(row["점심_매출비중"]),
    afternoonSalesRatio: toNullableNumber(row["오후_매출비중"]),
    eveningSalesRatio: toNullableNumber(row["저녁_매출비중"]),
    nightSalesRatio: toNullableNumber(row["심야_매출비중"]),
    totalFootTraffic: toNullableNumber(row["총_유동인구_수"]),
    targetFootTraffic: toNullableNumber(row["2030_유동인구"]),
    targetFootTrafficRatio: toNullableNumber(row["2030_유동인구비율"]),
    estimatedMonthlyFootTraffic: toNullableNumber(row["월_유동인구추정"]),
    cafeConversionRate: toNullableNumber(row["카페전환효율"]),
    targetCafeConversionRate: toNullableNumber(row["2030_카페전환효율"]),
    rawFeatures: row,
  };
}

async function main() {
  const csvPath = resolveCsvPath();
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const businessCategory = await prisma.businessCategory.upsert({
    where: { code: CATEGORY.code },
    update: { name: CATEGORY.name },
    create: CATEGORY,
  });

  const dataset = await prisma.dataset.upsert({
    where: { code: DATASET.code },
    update: {
      name: DATASET.name,
      description: DATASET.description,
      sourcePath: csvPath,
    },
    create: {
      ...DATASET,
      sourcePath: csvPath,
    },
  });

  let importedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const districtCode = toNullableString(row["행정동_코드"]);
    const districtName = toNullableString(row["행정동_코드_명"]);

    if (!districtCode || !districtName) {
      skippedCount += 1;
      continue;
    }

    const district = await prisma.district.upsert({
      where: { code: districtCode },
      update: { name: districtName },
      create: {
        code: districtCode,
        name: districtName,
      },
    });

    const featureData = buildAreaFeatureData(row);

    await prisma.areaFeature.upsert({
      where: {
        area_feature_identity: {
          datasetId: dataset.id,
          businessCategoryId: businessCategory.id,
          districtId: district.id,
        },
      },
      update: featureData,
      create: {
        ...featureData,
        datasetId: dataset.id,
        businessCategoryId: businessCategory.id,
        districtId: district.id,
      },
    });

    importedCount += 1;
  }

  console.log(
    `seed complete: dataset=${dataset.name}, category=${businessCategory.code}, imported=${importedCount}, skipped=${skippedCount}`
  );
}

main()
  .catch((error) => {
    console.error("seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
