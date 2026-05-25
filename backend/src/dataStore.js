const fs = require("fs");
const path = require("path");
const {
  buildAiReason,
  buildRuleBasedReasons,
  getAiConfig,
  getStrategyGuide,
} = require("./aiReason.service");

const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve(__dirname, "../../data_analysis/data/processed/cafe_area_features.csv");

const DEFAULT_INDUSTRY = "커피-음료";
const DEFAULT_TARGET_AGES = ["20", "30"];
const WEEKS_PER_MONTH = 365.25 / 12 / 7;

const TIME_OPTIONS = [
  { value: "dawn", label: "새벽", range: "00~06", salesColumn: "새벽_매출비중", populationColumn: "새벽_유동인구비중" },
  { value: "morning", label: "오전", range: "06~11", salesColumn: "오전_매출비중", populationColumn: "오전_유동인구비중" },
  { value: "lunch", label: "점심", range: "11~14", salesColumn: "점심_매출비중", populationColumn: "점심_유동인구비중" },
  { value: "afternoon", label: "오후", range: "14~17", salesColumn: "오후_매출비중", populationColumn: "오후_유동인구비중" },
  { value: "evening", label: "저녁", range: "17~21", salesColumn: "저녁_매출비중", populationColumn: "저녁_유동인구비중" },
  { value: "night", label: "심야", range: "21~24", salesColumn: "심야_매출비중", populationColumn: "심야_유동인구비중" },
];

const SCORE_WEIGHTS = {
  conversionRate: 0.35,
  targetSalesRatio: 0.3,
  selectedTimeSalesRatio: 0.25,
  averagePrice: 0.1,
};

const QUALITY_GRADES = [
  { min: 80, label: "높음" },
  { min: 60, label: "보통" },
  { min: 40, label: "주의" },
  { min: 0, label: "낮음" },
];
const DEFAULT_MIN_RECOMMENDATION_QUALITY = 60;
const RECOMMENDED_TIER = "안정 추천";
const REVIEW_TIER = "검토 후보";

const AGE_SUFFIX = {
  10: "10",
  20: "20",
  30: "30",
  40: "40",
  50: "50",
  60: "60_이상",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function normalize(value, min, max) {
  if (value === null || value === undefined || !Number.isFinite(value) || min === max) {
    return 0;
  }
  return Math.min(Math.max((value - min) / (max - min), 0), 1);
}

function rowToObject(headers, row) {
  const item = {};
  headers.forEach((header, index) => {
    const rawValue = row[index] ?? "";
    const numericValue = toNumber(rawValue);
    item[header] = numericValue === null ? rawValue : numericValue;
  });
  return item;
}

function loadAreas() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found: ${DATA_PATH}`);
  }

  const csv = fs.readFileSync(DATA_PATH, "utf8").replace(/^\uFEFF/, "");
  const [headers, ...rows] = parseCsv(csv);
  return rows.map((row) => rowToObject(headers, row));
}

const areas = loadAreas();

function getTimeOption(input = "evening") {
  const value = String(input || "evening").trim();
  return (
    TIME_OPTIONS.find(
      (option) =>
        option.value === value ||
        option.range === value ||
        option.label === value ||
        option.label.toLowerCase() === value.toLowerCase()
    ) ?? null
  );
}

function parseTargetAges(input) {
  if (!input) {
    return DEFAULT_TARGET_AGES;
  }

  const values = String(input)
    .split(",")
    .map((age) => age.trim())
    .filter(Boolean);

  if (values.includes("all") || values.includes("전체")) {
    return ["10", "20", "30", "40", "50", "60"];
  }

  const valid = values.filter((age) => AGE_SUFFIX[age]);
  return valid.length > 0 ? valid : DEFAULT_TARGET_AGES;
}

function sumColumns(area, columns) {
  return columns.reduce((sum, column) => {
    const value = area[column];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

function getTargetSalesCount(area, targetAges) {
  return sumColumns(
    area,
    targetAges.map((age) => `연령대_${AGE_SUFFIX[age]}_매출_건수`)
  );
}

function getTargetPopulation(area, targetAges) {
  return sumColumns(
    area,
    targetAges.map((age) => `연령대_${AGE_SUFFIX[age]}_유동인구_수`)
  );
}

function enrichArea(area, timeOption, targetAges) {
  const targetSalesCount = getTargetSalesCount(area, targetAges);
  const targetPopulation = getTargetPopulation(area, targetAges);
  const totalSalesCount = area["총매출건수"];
  const totalPopulation = area["총_유동인구_수"];
  const selectedTimeSalesRatio = area[timeOption.salesColumn];
  const selectedTimePopulationRatio = area[timeOption.populationColumn];

  return {
    raw: area,
    areaCode: String(area["행정동_코드"]),
    areaName: area["행정동_코드_명"],
    industry: area["업종명"] || DEFAULT_INDUSTRY,
    totalSalesAmount: area["당월_매출_금액"],
    totalSalesCount: area["당월_매출_건수"],
    totalAgeSalesCount: totalSalesCount,
    targetSalesCount,
    targetSalesRatio: safeDivide(targetSalesCount, totalSalesCount),
    totalPopulation,
    targetPopulation,
    targetPopulationRatio: safeDivide(targetPopulation, totalPopulation),
    monthlyEstimatedPopulation: area["월_유동인구추정"],
    conversionRate: area["카페전환효율"],
    targetConversionRate: safeDivide(targetSalesCount, targetPopulation * WEEKS_PER_MONTH),
    selectedTimeSalesRatio,
    selectedTimePopulationRatio,
    averagePrice: area["객단가"],
    peakTime: area["시간대추천"],
    timeSalesRatios: Object.fromEntries(
      TIME_OPTIONS.map((option) => [option.value, area[option.salesColumn] ?? null])
    ),
    timePopulationRatios: Object.fromEntries(
      TIME_OPTIONS.map((option) => [option.value, area[option.populationColumn] ?? null])
    ),
  };
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0;
}

function getQualityGrade(score) {
  return QUALITY_GRADES.find((grade) => score >= grade.min)?.label ?? "낮음";
}

function parseMinQualityScore(input) {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MIN_RECOMMENDATION_QUALITY;
  }
  return Math.min(Math.max(parsed, 0), 100);
}

function getRecommendationTier(dataQuality, minQualityScore) {
  return dataQuality.score >= minQualityScore ? RECOMMENDED_TIER : REVIEW_TIER;
}

function getRanges(items, useAdjustedScore = false) {
  const fields = [
    "conversionRate",
    "targetSalesRatio",
    "selectedTimeSalesRatio",
    "averagePrice",
  ];

  return Object.fromEntries(
    fields.map((field) => {
      const values = items
        .map((item) => item[field])
        .filter((value) => typeof value === "number");
      if (useAdjustedScore && values.length > 0) {
        return [field, { min: percentile(values, 0.01), max: percentile(values, 0.99) }];
      }
      return [field, { min: Math.min(...values), max: Math.max(...values) }];
    })
  );
}

function buildDataQuality(area, stats) {
  const salesVolumeScore = normalize(
    area.totalSalesCount,
    stats.lowTotalSalesCount,
    stats.highTotalSalesCount
  );
  const populationScore = normalize(
    area.totalPopulation,
    stats.lowTotalPopulation,
    stats.highTotalPopulation
  );
  const targetPopulationScore = normalize(
    area.targetPopulation,
    stats.lowTargetPopulation,
    stats.highTargetPopulation
  );
  const isHighConversionOutlier =
    typeof area.conversionRate === "number" &&
    area.conversionRate >= stats.extremeHighCafeConversionRate;
  const isLowConversionOutlier =
    typeof area.conversionRate === "number" &&
    area.conversionRate <= stats.extremeLowCafeConversionRate;
  const outlierScore = isHighConversionOutlier || isLowConversionOutlier ? 0.35 : 1;

  const score = round(
    (salesVolumeScore * 0.35 +
      populationScore * 0.25 +
      targetPopulationScore * 0.25 +
      outlierScore * 0.15) *
      100,
    0
  );
  const warnings = [];

  if (area.totalSalesCount < stats.lowTotalSalesCount) {
    warnings.push("매출건수 표본이 작은 편이라 전환효율이 실제보다 크게 흔들릴 수 있습니다.");
  }
  if (area.totalPopulation < stats.lowTotalPopulation) {
    warnings.push("총 유동인구가 낮은 편이라 특정 매장의 영향이 크게 반영됐을 수 있습니다.");
  }
  if (area.targetPopulation < stats.lowTargetPopulation) {
    warnings.push("선택한 타깃 연령대 유동인구 표본이 작아 타깃 적합도 해석에 주의가 필요합니다.");
  }
  if (isHighConversionOutlier) {
    warnings.push("카페전환효율이 상위 1% 수준으로 높아 이상치 가능성이 있습니다.");
  }
  if (isLowConversionOutlier) {
    warnings.push("카페전환효율이 하위 1% 수준으로 낮아 데이터 누락 또는 특수 상권 여부를 확인해야 합니다.");
  }
  if (
    area.selectedTimeSalesRatio - area.selectedTimePopulationRatio > 0.15 &&
    area.selectedTimePopulationRatio < stats.avgSelectedTimePopulationRatio
  ) {
    warnings.push("선택 시간대 매출 집중도가 유동인구보다 높게 나타나 재방문/목적형 소비 영향일 수 있습니다.");
  }

  return {
    score,
    grade: getQualityGrade(score),
    warnings: warnings.slice(0, 3),
    factors: {
      salesVolume: round(salesVolumeScore),
      populationVolume: round(populationScore),
      targetPopulationVolume: round(targetPopulationScore),
      conversionOutlier: isHighConversionOutlier || isLowConversionOutlier,
    },
  };
}

function scoreArea(area, ranges, stats) {
  const conversionScore = normalize(
    area.conversionRate,
    ranges.conversionRate.min,
    ranges.conversionRate.max
  );
  const targetSalesScore = normalize(
    area.targetSalesRatio,
    ranges.targetSalesRatio.min,
    ranges.targetSalesRatio.max
  );
  const timeScore = normalize(
    area.selectedTimeSalesRatio,
    ranges.selectedTimeSalesRatio.min,
    ranges.selectedTimeSalesRatio.max
  );
  const priceScore = normalize(
    area.averagePrice,
    ranges.averagePrice.min,
    ranges.averagePrice.max
  );

  const rawScore =
    conversionScore * SCORE_WEIGHTS.conversionRate +
    targetSalesScore * SCORE_WEIGHTS.targetSalesRatio +
    timeScore * SCORE_WEIGHTS.selectedTimeSalesRatio +
    priceScore * SCORE_WEIGHTS.averagePrice;
  const dataQuality = buildDataQuality(area, stats);
  const reliabilityFactor = 0.55 + (dataQuality.score / 100) * 0.45;
  const adjustedRawScore = rawScore * reliabilityFactor;

  return {
    score: round(adjustedRawScore * 100, 1),
    baseScore: round(rawScore * 100, 1),
    reliabilityFactor: round(reliabilityFactor),
    dataQuality,
    scoreBreakdown: {
      cafeConversionRate: round(conversionScore * SCORE_WEIGHTS.conversionRate * 100, 1),
      mzSalesRatio: round(targetSalesScore * SCORE_WEIGHTS.targetSalesRatio * 100, 1),
      selectedTimeSalesRatio: round(timeScore * SCORE_WEIGHTS.selectedTimeSalesRatio * 100, 1),
      averageOrderValue: round(priceScore * SCORE_WEIGHTS.averagePrice * 100, 1),
    },
  };
}

function getStats(enrichedAreas) {
  const average = (field) => {
    const values = enrichedAreas
      .map((area) => area[field])
      .filter((value) => typeof value === "number");
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };

  const percentile = (field, ratio) => {
    const values = enrichedAreas
      .map((area) => area[field])
      .filter((value) => typeof value === "number")
      .sort((a, b) => a - b);
    return values[Math.floor((values.length - 1) * ratio)] ?? 0;
  };

  return {
    avgMzSalesRatio: average("targetSalesRatio"),
    avgAverageOrderValue: average("averagePrice"),
    avgCafeConversionRate: average("conversionRate"),
    avgSelectedTimePopulationRatio: average("selectedTimePopulationRatio"),
    highCafeConversionRate: percentile("conversionRate", 0.75),
    extremeLowCafeConversionRate: percentile("conversionRate", 0.01),
    extremeHighCafeConversionRate: percentile("conversionRate", 0.99),
    lowTotalSalesCount: percentile("totalSalesCount", 0.1),
    highTotalSalesCount: percentile("totalSalesCount", 0.75),
    lowTotalPopulation: percentile("totalPopulation", 0.1),
    highTotalPopulation: percentile("totalPopulation", 0.75),
    lowTargetPopulation: percentile("targetPopulation", 0.1),
    highTargetPopulation: percentile("targetPopulation", 0.75),
  };
}

function toRecommendation(area, rank, scored, timeOption, stats) {
  const item = {
    rank,
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: scored.score,
    baseScore: scored.baseScore,
    reliabilityFactor: scored.reliabilityFactor,
    dataQuality: scored.dataQuality,
    metrics: {
      targetSalesRatio: round(area.targetSalesRatio),
      targetPopulationRatio: round(area.targetPopulationRatio),
      conversionRate: round(area.conversionRate),
      selectedTimeSalesRatio: round(area.selectedTimeSalesRatio),
      selectedTimePopulationRatio: round(area.selectedTimePopulationRatio),
      averagePrice: round(area.averagePrice, 0),
      peakTime: area.peakTime,

      mzSalesRatio: round(area.targetSalesRatio),
      mzPopulationRatio: round(area.targetPopulationRatio),
      cafeConversionRate: round(area.conversionRate),
      averageOrderValue: round(area.averagePrice, 0),
      totalPopulation: round(area.totalPopulation, 0),
      mzPopulation: round(area.targetPopulation, 0),
    },
    scoreBreakdown: scored.scoreBreakdown,
    cautions: scored.dataQuality.warnings,
    strategyGuide: getStrategyGuide(timeOption),
  };

  item.reasons = buildRuleBasedReasons(
    {
      cafeConversionRate: area.conversionRate,
      mzSalesRatio: area.targetSalesRatio,
      mzPopulationRatio: area.targetPopulationRatio,
      averageOrderValue: area.averagePrice,
      peakTimeSalesRatio: area.raw["피크타임_매출비중"],
    },
    { selectedTimeSalesRatio: area.selectedTimeSalesRatio },
    timeOption,
    stats
  );

  return item;
}

function getPreparedAreas({ time = "evening", targetAges, industry, useAdjustedScore } = {}) {
  const timeOption = getTimeOption(time);
  if (!timeOption) {
    return null;
  }

  const ages = parseTargetAges(targetAges);
  const industryName = industry || DEFAULT_INDUSTRY;
  const adjustedScoreEnabled = String(useAdjustedScore).toLowerCase() === "true";
  const filtered = areas.filter((area) => (area["업종명"] || DEFAULT_INDUSTRY) === industryName);
  const enriched = filtered.map((area) => enrichArea(area, timeOption, ages));
  const ranges = getRanges(enriched, adjustedScoreEnabled);
  const stats = getStats(enriched);

  return { timeOption, targetAges: ages, industryName, enriched, ranges, stats, useAdjustedScore: adjustedScoreEnabled };
}

function getRecommendations(query = {}) {
  const prepared = getPreparedAreas(query);
  if (!prepared) {
    return null;
  }

  const maxItems = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 50);
  const minQualityScore = parseMinQualityScore(query.minQualityScore);
  const allowLowConfidenceTop = String(query.allowLowConfidenceTop).toLowerCase() === "true";
  const scoredItems = prepared.enriched
    .map((area) => {
      const scored = scoreArea(area, prepared.ranges, prepared.stats);
      const item = toRecommendation(area, 0, scored, prepared.timeOption, prepared.stats);
      const reviewRequired = item.dataQuality.score < minQualityScore;
      return {
        ...item,
        reviewRequired,
        recommendationTier: getRecommendationTier(item.dataQuality, minQualityScore),
      };
    })
    .sort((a, b) => {
      if (!allowLowConfidenceTop && a.reviewRequired !== b.reviewRequired) {
        return Number(a.reviewRequired) - Number(b.reviewRequired);
      }
      return b.score - a.score;
    });

  const items = scoredItems
    .slice(0, maxItems)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    criteria: {
      industry: prepared.industryName,
      target: `${prepared.targetAges.join(",")}대`,
      targetAges: prepared.targetAges,
      selectedTime: prepared.timeOption.value,
      timeLabel: prepared.timeOption.label,
      timeRange: prepared.timeOption.range,
      weights: SCORE_WEIGHTS,
      useAdjustedScore: prepared.useAdjustedScore,
      minQualityScore,
      rankingPolicy: allowLowConfidenceTop
        ? "점수순 정렬"
        : `신뢰도 ${minQualityScore}점 이상 우선 정렬`,
      reviewCandidateCount: scoredItems.filter((item) => item.reviewRequired).length,
    },
    items,
  };
}

async function getRecommendationsWithAi(query = {}) {
  const result = getRecommendations(query);
  if (!result) {
    return null;
  }

  const useAi = String(query.ai).toLowerCase() === "true";
  const aiConfig = getAiConfig();
  if (!useAi) {
    return {
      ...result,
      explanation: {
        requestedAi: false,
        provider: "rule",
        model: null,
        mode: "rule",
        usedFallback: false,
      },
    };
  }

  const timeOption = getTimeOption(query.time || "evening");
  const items = [];
  for (const item of result.items) {
    const aiReason = await buildAiReason(item, timeOption, useAi);
    items.push({ ...item, aiReason });
  }
  const usedFallback = items.some((item) => item.aiReason?.mode === "rule-fallback");

  return {
    ...result,
    explanation: {
      requestedAi: true,
      provider: aiConfig.provider,
      model: aiConfig.model,
      mode: usedFallback ? "rule-fallback" : aiConfig.mode,
      usedFallback,
    },
    items,
  };
}

function searchAreas(query = "", limit = 20) {
  const keyword = String(query || "").trim().toLowerCase();
  const maxItems = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

  return {
    items: areas
      .filter((area) => {
        if (!keyword) {
          return true;
        }
        return (
          String(area["행정동_코드"]).includes(keyword) ||
          String(area["행정동_코드_명"]).toLowerCase().includes(keyword)
        );
      })
      .slice(0, maxItems)
      .map((area) => ({
        areaCode: String(area["행정동_코드"]),
        areaName: area["행정동_코드_명"],
      })),
  };
}

function getAreaDetail(areaCode, query = {}) {
  const prepared = getPreparedAreas(query);
  if (!prepared) {
    return null;
  }

  const lookup = String(areaCode);
  const area = prepared.enriched.find(
    (item) => item.areaCode === lookup || item.areaName === lookup
  );
  if (!area) {
    return null;
  }

  const scored = scoreArea(area, prepared.ranges, prepared.stats);
  const recommendation = toRecommendation(area, null, scored, prepared.timeOption, prepared.stats);
  const minQualityScore = parseMinQualityScore(query.minQualityScore);
  const reviewRequired = recommendation.dataQuality.score < minQualityScore;

  return {
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: recommendation.score,
    baseScore: recommendation.baseScore,
    reliabilityFactor: recommendation.reliabilityFactor,
    dataQuality: recommendation.dataQuality,
    reviewRequired,
    recommendationTier: getRecommendationTier(recommendation.dataQuality, minQualityScore),
    metrics: {
      totalSalesAmount: area.totalSalesAmount,
      totalSalesCount: area.totalSalesCount,
      totalPopulation: area.totalPopulation,
      targetPopulation: area.targetPopulation,
      targetSalesRatio: round(area.targetSalesRatio),
      targetPopulationRatio: round(area.targetPopulationRatio),
      conversionRate: round(area.conversionRate),
      targetConversionRate: round(area.targetConversionRate),
      selectedTimeSalesRatio: round(area.selectedTimeSalesRatio),
      selectedTimePopulationRatio: round(area.selectedTimePopulationRatio),
      averagePrice: round(area.averagePrice, 0),

      mzPopulation: round(area.targetPopulation, 0),
      mzSalesRatio: round(area.targetSalesRatio),
      mzPopulationRatio: round(area.targetPopulationRatio),
      cafeConversionRate: round(area.conversionRate),
      mzCafeConversionRate: round(area.targetConversionRate),
      averageOrderValue: round(area.averagePrice, 0),
    },
    timeSalesRatios: Object.fromEntries(
      TIME_OPTIONS.map((option) => [option.value, round(area.timeSalesRatios[option.value])])
    ),
    timePopulationRatios: Object.fromEntries(
      TIME_OPTIONS.map((option) => [option.value, round(area.timePopulationRatios[option.value])])
    ),
    scoreBreakdown: recommendation.scoreBreakdown,
    cautions: recommendation.cautions,
    reasons: recommendation.reasons,
    strategyGuide: recommendation.strategyGuide,
  };
}

async function getAreaDetailWithAi(areaCode, time = "evening", ai = "false", extraQuery = {}) {
  const detail = getAreaDetail(areaCode, { ...extraQuery, time });
  const timeOption = getTimeOption(time);
  if (!detail || !timeOption) {
    return null;
  }

  const useAi = String(ai).toLowerCase() === "true";
  const item = {
    areaCode: detail.areaCode,
    areaName: detail.areaName,
    score: detail.score,
    dataQuality: detail.dataQuality,
    reviewRequired: detail.reviewRequired,
    recommendationTier: detail.recommendationTier,
    metrics: detail.metrics,
    cautions: detail.cautions,
    reasons: detail.reasons,
    strategyGuide: detail.strategyGuide,
  };

  return {
    ...detail,
    aiReason: await buildAiReason(item, timeOption, useAi),
  };
}

function compareAreas(areaA, areaB, query = {}) {
  const first = getAreaDetail(areaA, query);
  const second = getAreaDetail(areaB, query);
  const timeOption = getTimeOption(query.time || "evening");

  if (!first || !second || !timeOption) {
    return null;
  }

  const winner = first.score >= second.score ? first : second;
  const strongerMetric =
    first.metrics.conversionRate >= second.metrics.conversionRate
      ? "카페전환효율"
      : "타깃 매출비율";

  return {
    criteria: {
      selectedTime: timeOption.value,
      timeLabel: timeOption.label,
      timeRange: timeOption.range,
      targetAges: parseTargetAges(query.targetAges),
      minQualityScore: parseMinQualityScore(query.minQualityScore),
    },
    areas: [first, second],
    summary: `${timeOption.label} 기준으로는 ${winner.areaName}의 추천점수가 더 높습니다. 주요 차이는 ${strongerMetric}과 선택 시간대 매출비중에서 발생합니다.`,
  };
}

function getMeta() {
  return {
    serviceName: "황금을 찾아라",
    industry: DEFAULT_INDUSTRY,
    target: "기본값 20대,30대",
    timeOptions: TIME_OPTIONS,
    ageOptions: ["10", "20", "30", "40", "50", "60"],
    scoreWeights: SCORE_WEIGHTS,
    explanation: getAiConfig(),
    data: {
      totalAreas: areas.length,
      path: DATA_PATH,
    },
  };
}

module.exports = {
  TIME_OPTIONS,
  compareAreas,
  getAreaDetail,
  getAreaDetailWithAi,
  getMeta,
  getRecommendations,
  getRecommendationsWithAi,
  getTimeOption,
  parseTargetAges,
  searchAreas,
};
