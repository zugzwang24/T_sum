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

const TIME_OPTIONS = [
  { value: "dawn", label: "새벽", range: "00~06", description: "심야와 이른 새벽 수요" },
  { value: "morning", label: "오전", range: "06~11", description: "출근길과 모닝커피 수요" },
  { value: "lunch", label: "점심", range: "11~14", description: "점심 식사 후 카페 수요" },
  { value: "afternoon", label: "오후", range: "14~17", description: "디저트, 공부, 브런치 수요" },
  { value: "evening", label: "저녁", range: "17~21", description: "모임, 데이트, 퇴근 후 수요" },
  { value: "night", label: "심야", range: "21~24", description: "늦은 시간대 카페 수요" },
];

const SCORE_WEIGHTS = {
  cafeConversionRate: 0.35,
  mzSalesRatio: 0.3,
  selectedTimeSalesRatio: 0.25,
  averageOrderValue: 0.1,
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

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function rowToArea(row) {
  return {
    areaCode: String(row[0]),
    areaName: row[1],
    totalSalesAmount: toNumber(row[2]),
    totalSalesCount: toNumber(row[3]),
    totalAgeSalesCount: toNumber(row[4]),
    mzSalesCount: toNumber(row[5]),
    peakTimeSalesRatio: toNumber(row[6]),
    originalRecommendedTimeSlot: row[7],
    timeSalesRatios: {
      dawn: toNumber(row[8]),
      morning: toNumber(row[9]),
      lunch: toNumber(row[10]),
      afternoon: toNumber(row[11]),
      evening: toNumber(row[12]),
      night: toNumber(row[13]),
    },
    mzSalesRatio: toNumber(row[14]),
    averageOrderValue: toNumber(row[15]),
    totalPopulation: toNumber(row[16]),
    population20s: toNumber(row[17]),
    population30s: toNumber(row[18]),
    mzPopulation: toNumber(row[19]),
    mzPopulationRatio: toNumber(row[20]),
    monthlyEstimatedPopulation: toNumber(row[21]),
    cafeConversionRate: toNumber(row[22]),
    mzCafeConversionRate: toNumber(row[23]),
  };
}

function loadAreas() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found: ${DATA_PATH}`);
  }

  const csv = fs.readFileSync(DATA_PATH, "utf8").replace(/^\uFEFF/, "");
  const [, ...rows] = parseCsv(csv);
  return rows.map(rowToArea);
}

const areas = loadAreas();

function getTimeOption(input = "evening") {
  const value = String(input || "evening").trim();
  const found = TIME_OPTIONS.find(
    (option) =>
      option.value === value ||
      option.range === value ||
      option.label.toLowerCase() === value.toLowerCase()
  );

  if (!found) {
    return null;
  }

  return found;
}

function getRanges(items, timeKey) {
  const fields = [
    "cafeConversionRate",
    "mzSalesRatio",
    "averageOrderValue",
    `time:${timeKey}`,
  ];

  return Object.fromEntries(
    fields.map((field) => {
      const values = items
        .map((item) =>
          field.startsWith("time:")
            ? item.timeSalesRatios[timeKey]
            : item[field]
        )
        .filter((value) => typeof value === "number");

      return [field, { min: Math.min(...values), max: Math.max(...values) }];
    })
  );
}

function normalize(value, min, max) {
  if (value === null || value === undefined || !Number.isFinite(value) || min === max) {
    return 0;
  }
  return (value - min) / (max - min);
}

function getAverage(field) {
  const values = areas
    .map((area) => area[field])
    .filter((value) => typeof value === "number");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPercentile(field, percentile) {
  const values = areas
    .map((area) => area[field])
    .filter((value) => typeof value === "number")
    .sort((a, b) => a - b);
  const index = Math.floor((values.length - 1) * percentile);
  return values[index] ?? 0;
}

const stats = {
  avgMzSalesRatio: getAverage("mzSalesRatio"),
  avgAverageOrderValue: getAverage("averageOrderValue"),
  avgCafeConversionRate: getAverage("cafeConversionRate"),
  highCafeConversionRate: getPercentile("cafeConversionRate", 0.75),
};

function scoreArea(area, timeOption, ranges) {
  const selectedTimeSalesRatio = area.timeSalesRatios[timeOption.value] ?? 0;
  const conversionScore = normalize(
    area.cafeConversionRate,
    ranges.cafeConversionRate.min,
    ranges.cafeConversionRate.max
  );
  const mzSalesScore = normalize(
    area.mzSalesRatio,
    ranges.mzSalesRatio.min,
    ranges.mzSalesRatio.max
  );
  const timeScore = normalize(
    selectedTimeSalesRatio,
    ranges[`time:${timeOption.value}`].min,
    ranges[`time:${timeOption.value}`].max
  );
  const orderValueScore = normalize(
    area.averageOrderValue,
    ranges.averageOrderValue.min,
    ranges.averageOrderValue.max
  );

  const rawScore =
    conversionScore * SCORE_WEIGHTS.cafeConversionRate +
    mzSalesScore * SCORE_WEIGHTS.mzSalesRatio +
    timeScore * SCORE_WEIGHTS.selectedTimeSalesRatio +
    orderValueScore * SCORE_WEIGHTS.averageOrderValue;

  return {
    score: round(rawScore * 100, 1),
    selectedTimeSalesRatio,
    scoreBreakdown: {
      cafeConversionRate: round(conversionScore * SCORE_WEIGHTS.cafeConversionRate * 100, 1),
      mzSalesRatio: round(mzSalesScore * SCORE_WEIGHTS.mzSalesRatio * 100, 1),
      selectedTimeSalesRatio: round(timeScore * SCORE_WEIGHTS.selectedTimeSalesRatio * 100, 1),
      averageOrderValue: round(orderValueScore * SCORE_WEIGHTS.averageOrderValue * 100, 1),
    },
  };
}

function toRecommendation(area, rank, timeOption, ranges) {
  const scored = scoreArea(area, timeOption, ranges);

  return {
    rank,
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: scored.score,
    metrics: {
      mzSalesRatio: round(area.mzSalesRatio),
      mzPopulationRatio: round(area.mzPopulationRatio),
      cafeConversionRate: round(area.cafeConversionRate),
      selectedTimeSalesRatio: round(scored.selectedTimeSalesRatio),
      averageOrderValue: round(area.averageOrderValue, 0),
      totalPopulation: round(area.totalPopulation, 0),
      mzPopulation: round(area.mzPopulation, 0),
    },
    scoreBreakdown: scored.scoreBreakdown,
    reasons: buildRuleBasedReasons(area, scored, timeOption, stats),
    strategyGuide: getStrategyGuide(timeOption),
  };
}

function getRecommendations({ time = "evening", limit = 10 } = {}) {
  const timeOption = getTimeOption(time);
  if (!timeOption) {
    return null;
  }

  const ranges = getRanges(areas, timeOption.value);
  const maxItems = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);

  const items = areas
    .map((area) => toRecommendation(area, 0, timeOption, ranges))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    criteria: {
      industry: "커피·음료",
      target: "2030 고객",
      selectedTime: timeOption.value,
      timeLabel: timeOption.label,
      timeRange: timeOption.range,
    },
    items,
  };
}

async function getRecommendationsWithAi({ time = "evening", limit = 10, ai = "false" } = {}) {
  const result = getRecommendations({ time, limit });
  if (!result) {
    return null;
  }

  const useAi = String(ai).toLowerCase() === "true";
  if (!useAi) {
    return {
      ...result,
      explanation: {
        requestedAi: false,
        mode: "rule",
      },
    };
  }

  const timeOption = getTimeOption(time);
  const items = [];

  for (const item of result.items) {
    const aiReason = await buildAiReason(item, timeOption, useAi);
    items.push({ ...item, aiReason });
  }

  return {
    ...result,
    explanation: {
      requestedAi: useAi,
      mode: useAi ? "local-llm-with-rule-fallback" : "rule",
    },
    items,
  };
}

function searchAreas(query = "", limit = 20) {
  const keyword = String(query || "").trim().toLowerCase();
  const maxItems = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

  const items = areas
    .filter((area) => {
      if (!keyword) {
        return true;
      }
      return (
        area.areaCode.includes(keyword) ||
        area.areaName.toLowerCase().includes(keyword)
      );
    })
    .slice(0, maxItems)
    .map((area) => ({ areaCode: area.areaCode, areaName: area.areaName }));

  return { items };
}

function getAreaDetail(areaCode, time = "evening") {
  const area = areas.find((item) => item.areaCode === String(areaCode));
  const timeOption = getTimeOption(time);
  if (!area || !timeOption) {
    return null;
  }

  const ranges = getRanges(areas, timeOption.value);
  const recommendation = toRecommendation(area, null, timeOption, ranges);

  return {
    areaCode: area.areaCode,
    areaName: area.areaName,
    score: recommendation.score,
    metrics: {
      totalSalesAmount: area.totalSalesAmount,
      totalSalesCount: area.totalSalesCount,
      totalPopulation: area.totalPopulation,
      mzPopulation: area.mzPopulation,
      mzSalesRatio: round(area.mzSalesRatio),
      mzPopulationRatio: round(area.mzPopulationRatio),
      cafeConversionRate: round(area.cafeConversionRate),
      mzCafeConversionRate: round(area.mzCafeConversionRate),
      selectedTimeSalesRatio: round(recommendation.metrics.selectedTimeSalesRatio),
      averageOrderValue: round(area.averageOrderValue, 0),
    },
    timeSalesRatios: Object.fromEntries(
      TIME_OPTIONS.map((option) => [
        option.value,
        round(area.timeSalesRatios[option.value]),
      ])
    ),
    scoreBreakdown: recommendation.scoreBreakdown,
    reasons: recommendation.reasons,
    strategyGuide: recommendation.strategyGuide,
  };
}

async function getAreaDetailWithAi(areaCode, time = "evening", ai = "false") {
  const detail = getAreaDetail(areaCode, time);
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

function compareAreas(areaA, areaB, time = "evening") {
  const first = getAreaDetail(areaA, time);
  const second = getAreaDetail(areaB, time);
  const timeOption = getTimeOption(time);

  if (!first || !second || !timeOption) {
    return null;
  }

  const winner = first.score >= second.score ? first : second;
  const strongerMetric =
    first.metrics.cafeConversionRate >= second.metrics.cafeConversionRate
      ? "카페전환효율"
      : "2030 매출비율";

  return {
    criteria: {
      selectedTime: timeOption.value,
      timeLabel: timeOption.label,
      timeRange: timeOption.range,
    },
    areas: [first, second],
    summary: `${timeOption.label} 기준으로는 ${winner.areaName}의 추천점수가 더 높습니다. 주요 차이는 ${strongerMetric}과 선택 시간대 매출비중에서 발생합니다.`,
  };
}

function getMeta() {
  return {
    serviceName: "황금을 찾아라",
    industry: "커피·음료",
    target: "2030 고객",
    timeOptions: TIME_OPTIONS,
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
  searchAreas,
};
