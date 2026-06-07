function isLocalDevelopmentHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getDefaultApiBaseUrl() {
  if (isLocalDevelopmentHost(window.location.hostname)) {
    return `http://${window.location.hostname === "::1" ? "localhost" : window.location.hostname}:4000/api`;
  }

  return "https://t-sum.onrender.com/api";
}

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl()
).replace(/\/$/, "");

const AUTH_TOKEN_KEY = "goldenCafe.authToken";

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export type TimeValue = "dawn" | "morning" | "lunch" | "afternoon" | "evening" | "night";

export type DataQuality = {
  score: number;
  grade: string;
  warnings: string[];
  factors?: Record<string, unknown>;
};

export type RecommendationItem = {
  rank: number;
  areaFeatureId?: string | null;
  districtId?: string | null;
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

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type SavedArea = {
  id: string;
  areaFeatureId: string;
  districtId: string;
  areaCode: string;
  areaName: string;
  createdAt: string;
  updatedAt?: string;
  metrics: {
    monthlySalesAmount?: number | null;
    monthlySalesCount?: number | null;
    totalSalesCount?: number | null;
    targetSalesRatio?: number | null;
    targetFootTraffic?: number | null;
    targetFootTrafficRatio?: number | null;
    cafeConversionRate?: number | null;
    averageTicket?: number | null;
    recommendedTimeBand?: string | null;
  };
};

export type ComparisonItem = SavedArea & {
  id: string;
};

export type Comparison = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ComparisonItem[];
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

async function fetchJson<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
    auth?: boolean;
  } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getStoredToken();
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      signal: controller.signal,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
    { timeoutMs: params.ai ? 25000 : 15000 }
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

export function register(params: { email: string; password: string; name?: string }) {
  return fetchJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: params,
    auth: false,
  });
}

export function login(params: { email: string; password: string }) {
  return fetchJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: params,
    auth: false,
  });
}

export function getMe() {
  return fetchJson<{ user: AuthUser }>("/auth/me");
}

export function getSavedAreas() {
  return fetchJson<{ items: SavedArea[] }>("/saved-areas");
}

export function saveArea(params: { areaFeatureId?: string | null; areaCode?: string }) {
  return fetchJson<{ item: SavedArea }>("/saved-areas", {
    method: "POST",
    body: params,
  });
}

export function deleteSavedArea(id: string) {
  return fetchJson<{ deleted: boolean; id: string }>(`/saved-areas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getComparisons() {
  return fetchJson<{ items: Comparison[] }>("/comparisons");
}

export function createComparison(params: { name?: string } = {}) {
  return fetchJson<{ item: Comparison }>("/comparisons", {
    method: "POST",
    body: params,
  });
}

export function getComparison(comparisonId: string) {
  return fetchJson<{ item: Comparison }>(`/comparisons/${encodeURIComponent(comparisonId)}`);
}

export function addComparisonItem(
  comparisonId: string,
  params: { areaFeatureId?: string | null; areaCode?: string }
) {
  return fetchJson<{ item: Comparison }>(
    `/comparisons/${encodeURIComponent(comparisonId)}/items`,
    {
      method: "POST",
      body: params,
    }
  );
}

export function deleteComparisonItem(comparisonId: string, itemId: string) {
  return fetchJson<{ deleted: boolean; id: string }>(
    `/comparisons/${encodeURIComponent(comparisonId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
    }
  );
}
