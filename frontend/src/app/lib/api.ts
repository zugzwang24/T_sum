export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://t-sum.onrender.com/api")
).replace(/\/$/, "");

export type TimeValue = "dawn" | "morning" | "lunch" | "afternoon" | "evening" | "night";

export type DataQuality = {
  score: number;
  grade: string;
  warnings: string[];
  factors?: Record<string, unknown>;
};

export type RecommendationItem = {
  rank: number;
  areaCode: string;
  areaName: string;
  score: number;
  baseScore?: number;
  reliabilityFactor?: number;
  recommendationTier?: string;
  reviewRequired?: boolean;
  dataQuality: DataQuality;
  metrics: {
    targetSalesRatio?: number;
    targetPopulation?: number;
    targetPopulationRatio?: number;
    conversionRate?: number;
    cafeConversionRate?: number;
    selectedTimeSalesRatio?: number;
    selectedTimePopulationRatio?: number;
    averagePrice?: number;
    averageOrderValue?: number;
    salesStability?: number;
    salesPeriodCount?: number;
    totalSalesAmount?: number;
    totalSalesCount?: number;
    totalPopulation?: number;
    targetConversionRate?: number;
  };
  scoreBreakdown?: Record<string, number>;
  cautions?: string[];
  reasons?: string[];
  strategyGuide?: string;
  aiReason?: {
    mode: string;
    text: string;
    error?: string;
    model?: string;
  };
};

export type RecommendationResponse = {
  criteria: {
    selectedTime: TimeValue;
    timeLabel: string;
    timeRange: string;
    targetAges: string[];
    weights: Record<string, number>;
    minQualityScore: number;
    useAdjustedScore: boolean;
    reviewCandidateCount: number;
  };
  items: RecommendationItem[];
  explanation?: {
    requestedAi: boolean;
    provider: string;
    model: string | null;
    mode: string;
    usedFallback: boolean;
  };
};

export type AreaDetail = RecommendationItem & {
  timeSalesRatios: Record<TimeValue, number>;
  timePopulationRatios: Record<TimeValue, number>;
};

export type CompareResponse = {
  criteria: {
    selectedTime: TimeValue;
    timeLabel: string;
    timeRange: string;
    targetAges: string[];
    minQualityScore: number;
  };
  areas: AreaDetail[];
  summary: string;
};

type QueryValue = string | number | boolean | undefined | null;

export function buildQuery(params: Record<string, QueryValue | QueryValue[]>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (Array.isArray(value)) {
      search.set(key, value.filter(Boolean).join(","));
      return;
    }
    search.set(key, String(value));
  });

  return search.toString();
}

async function fetchJson<T>(path: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `API 요청 실패 (${response.status})`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API 응답 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getRecommendations(params: {
  time: TimeValue;
  targetAges: string[];
  useAdjustedScore: boolean;
  minQualityScore: number;
  limit?: number;
}) {
  return fetchJson<RecommendationResponse>(
    `/recommendations?${buildQuery({
      time: params.time,
      targetAges: params.targetAges,
      useAdjustedScore: params.useAdjustedScore,
      minQualityScore: params.minQualityScore,
      limit: params.limit ?? 10,
    })}`
  );
}

export function getAreaDetail(
  areaCode: string,
  params: {
    time: TimeValue;
    targetAges: string[];
    useAdjustedScore: boolean;
    minQualityScore: number;
    ai?: boolean;
  }
) {
  return fetchJson<AreaDetail>(
    `/areas/${encodeURIComponent(areaCode)}?${buildQuery({
      time: params.time,
      targetAges: params.targetAges,
      useAdjustedScore: params.useAdjustedScore,
      minQualityScore: params.minQualityScore,
      ai: params.ai ?? true,
    })}`,
    params.ai ? 25000 : 15000
  );
}

export function compareAreas(params: {
  areaA: string;
  areaB: string;
  time: TimeValue;
  targetAges: string[];
  minQualityScore: number;
}) {
  return fetchJson<CompareResponse>(
    `/compare?${buildQuery({
      areaA: params.areaA,
      areaB: params.areaB,
      time: params.time,
      targetAges: params.targetAges,
      minQualityScore: params.minQualityScore,
    })}`
  );
}
