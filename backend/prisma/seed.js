const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { parse } = require("csv-parse/sync");

const prisma = new PrismaClient();

const DEFAULT_DATA_PATH = "../data_analysis/data/processed/area_features.csv";
const FALLBACK_CAFE_DATA_PATH = "../data_analysis/data/processed/cafe_area_features.csv";

const DATASET = {
  code: "SEOUL_MULTI_CATEGORY_AREA_FEATURES_2025",
  name: "2025 서울 다중 업종 상권 feature",
  description: "data_analysis/data/processed/area_features.csv 기반 다중 업종 상권 추천 feature 데이터",
};

const FALLBACK_CATEGORY = {
  code: "COFFEE_BEVERAGE",
  name: "커피-음료",
  label: "커피-음료",
};

function resolveProjectPath(filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.resolve(__dirname, "..", filePath);
}

function resolveCsvSource() {
  const configuredPath = process.env.DATA_PATH
    ? resolveProjectPath(process.env.DATA_PATH)
    : null;
  const defaultPath = resolveProjectPath(DEFAULT_DATA_PATH);
  const fallbackPath = resolveProjectPath(FALLBACK_CAFE_DATA_PATH);

  if (
    configuredPath &&
    path.basename(configuredPath) === "cafe_area_features.csv" &&
    fs.existsSync(defaultPath)
  ) {
    return {
      csvPath: defaultPath,
      usedFallback: false,
    };
  }

  if (configuredPath && fs.existsSync(configuredPath)) {
    return {
      csvPath: configuredPath,
      usedFallback: path.basename(configuredPath) === "cafe_area_features.csv",
    };
  }

  if (fs.existsSync(defaultPath)) {
    return {
      csvPath: defaultPath,
      usedFallback: false,
    };
  }

  if (fs.existsSync(fallbackPath)) {
    return {
      csvPath: fallbackPath,
      usedFallback: true,
    };
  }

  const attempted = [configuredPath, defaultPath, fallbackPath].filter(Boolean).join(", ");
  throw new Error(`feature CSV not found. attempted: ${attempted}`);
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

function firstNumber(row, columns) {
  for (const column of columns) {
    const value = toNullableNumber(row[column]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function firstString(row, columns) {
  for (const column of columns) {
    const value = toNullableString(row[column]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getCategoryFromRow(row, usedFallback) {
  if (usedFallback) {
    return {
      code: firstString(row, ["업종_코드"]) || FALLBACK_CATEGORY.code,
      name: firstString(row, ["업종명"]) || FALLBACK_CATEGORY.name,
      label: firstString(row, ["업종_라벨"]) || FALLBACK_CATEGORY.label,
    };
  }

  const name = firstString(row, ["업종명"]) || FALLBACK_CATEGORY.name;
  return {
    code: firstString(row, ["업종_코드"]) || name,
    name,
    label: firstString(row, ["업종_라벨"]) || name,
  };
}

function buildAreaFeatureData(row) {
  return {
    monthlySalesAmount: firstNumber(row, ["당월_매출_금액"]),
    monthlySalesCount: firstNumber(row, ["당월_매출_건수"]),
    totalSalesCount: firstNumber(row, ["총매출건수"]),
    targetSalesCount: firstNumber(row, ["2030_매출건수"]),
    peakTimeSalesRatio: firstNumber(row, ["피크타임_매출비중"]),
    recommendedTimeBand: firstString(row, ["시간대추천"]),
    quarterlySalesStability: firstNumber(row, ["분기별_매출안정성"]),
    targetSalesRatio: firstNumber(row, ["2030_매출비율"]),
    averageTicket: firstNumber(row, ["객단가"]),
    dawnSalesRatio: firstNumber(row, ["새벽_매출비중"]),
    morningSalesRatio: firstNumber(row, ["오전_매출비중"]),
    lunchSalesRatio: firstNumber(row, ["점심_매출비중"]),
    afternoonSalesRatio: firstNumber(row, ["오후_매출비중"]),
    eveningSalesRatio: firstNumber(row, ["저녁_매출비중"]),
    nightSalesRatio: firstNumber(row, ["심야_매출비중"]),
    totalFootTraffic: firstNumber(row, ["총_유동인구_수"]),
    targetFootTraffic: firstNumber(row, ["2030_유동인구"]),
    targetFootTrafficRatio: firstNumber(row, ["2030_유동인구비율"]),
    estimatedMonthlyFootTraffic: firstNumber(row, ["월_유동인구추정"]),
    cafeConversionRate: firstNumber(row, [
      "업종전환효율",
      "카페전환효율",
      "conversionRate",
      "cafeConversionRate",
    ]),
    targetCafeConversionRate: firstNumber(row, [
      "2030_업종전환효율",
      "2030_카페전환효율",
      "targetCafeConversionRate",
    ]),
    rawFeatures: row,
  };
}

function incrementCategoryCount(counts, category) {
  const key = `${category.code} / ${category.label || category.name}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}

async function runInBatches(items, batchSize, handler) {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map(handler));
  }
}

async function main() {
  const { csvPath, usedFallback } = resolveCsvSource();
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
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

  const validRows = [];
  const categories = new Map();
  const districts = new Map();
  const importedByCategory = new Map();
  let skippedCount = 0;

  for (const row of rows) {
    const districtCode = firstString(row, ["행정동_코드"]);
    const districtName = firstString(row, ["행정동_코드_명"]);

    if (!districtCode || !districtName) {
      skippedCount += 1;
      continue;
    }

    const category = getCategoryFromRow(row, usedFallback);
    categories.set(category.code, category);
    districts.set(districtCode, {
      code: districtCode,
      name: districtName,
    });
    validRows.push({
      row,
      categoryCode: category.code,
      districtCode,
    });
    incrementCategoryCount(importedByCategory, category);
  }

  const businessCategoryByCode = new Map();
  await runInBatches([...categories.values()], 10, async (category) => {
    const businessCategory = await prisma.businessCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        label: category.label,
      },
      create: {
        code: category.code,
        name: category.name,
        label: category.label,
      },
    });
    businessCategoryByCode.set(category.code, businessCategory);
  });

  const districtByCode = new Map();
  await runInBatches([...districts.values()], 50, async (districtInput) => {
    const district = await prisma.district.upsert({
      where: { code: districtInput.code },
      update: { name: districtInput.name },
      create: districtInput,
    });
    districtByCode.set(districtInput.code, district);
  });

  await runInBatches(validRows, 25, async ({ row, categoryCode, districtCode }) => {
    const businessCategory = businessCategoryByCode.get(categoryCode);
    const district = districtByCode.get(districtCode);
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
  });

  console.log(`[seed] source=${csvPath}`);
  console.log(`[seed] dataset=${dataset.code}`);
  console.log(`[seed] mode=${usedFallback ? "fallback-cafe" : "multi-category"}`);
  console.log("[seed] imported rows by category");
  for (const [category, count] of importedByCategory.entries()) {
    console.log(`- ${category}: ${count.toLocaleString("ko-KR")} rows`);
  }
  console.log(
    `[seed] complete imported=${validRows.length.toLocaleString("ko-KR")}, skipped=${skippedCount.toLocaleString("ko-KR")}`
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
