const fs = require("fs");
const path = require("path");
const {
  buildAiReason,
  buildRuleBasedReasons,
  getStrategyGuide,
} = require("./aiReason.service");

const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve(__dirname, "../../data_analysis/data/processed/cafe_area_features.csv");

const DEFAULT_INDUSTRY = "커피-음료";
const DEFAULT_TARGET_AGES = ["20", "30"];

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
    targetConversionRate: safeDivide(targetSalesCount, targetPopulation * 30),
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

function scoreArea(area, ranges) {
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

  return {
    score: round(rawScore * 100, 1),
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
    return values.reduce((sum, value) => sum + value, 0) / values.length;
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
    highCafeConversionRate: percentile("conversionRate", 0.75),
  };
}

function toRecommendation(area, rank, scored, timeOption, stats) {
  const item = {
    rank,
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: scored.score,
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
  const items = prepared.enriched
    .map((area) => {
      const scored = scoreArea(area, prepared.ranges);
      return toRecommendation(area, 0, scored, prepared.timeOption, prepared.stats);
    })
    .sort((a, b) => b.score - a.score)
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
  if (!useAi) {
    return {
      ...result,
      explanation: { requestedAi: false, mode: "rule" },
    };
  }

  const timeOption = getTimeOption(query.time || "evening");
  const items = [];
  for (const item of result.items) {
    const aiReason = await buildAiReason(item, timeOption, useAi);
    items.push({ ...item, aiReason });
  }

  return {
    ...result,
    explanation: { requestedAi: true, mode: "local-llm-with-rule-fallback" },
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

  const scored = scoreArea(area, prepared.ranges);
  const recommendation = toRecommendation(area, null, scored, prepared.timeOption, prepared.stats);

  return {
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: recommendation.score,
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
    metrics: detail.metrics,
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
    explanationMode: process.env.EXPLANATION_MODE || "rule",
    localLlm: {
      enabled: process.env.EXPLANATION_MODE === "local-llm",
      provider: process.env.LOCAL_LLM_PROVIDER || "ollama",
      model: process.env.LOCAL_LLM_MODEL || null,
    },
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
