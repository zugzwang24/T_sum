const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://localhost:11434/api/generate";
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || "llama3.1";
const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 60000);
let hasLoggedOpenAiResponse = false;

function getStrategyGuide(timeOption, category) {
  const categoryText = getCategoryDisplay(category);
  const isCafe = categoryText.businessTerm === "카페";
  const cafeGuides = {
    dawn: "새벽 시간대는 간단한 메뉴, 포장 동선, 안전한 매장 이미지가 중요합니다.",
    morning: "오전형 상권은 출근길 테이크아웃, 빠른 제조, 커피 세트 운영이 유리합니다.",
    lunch: "점심형 상권은 식후 음료, 가벼운 디저트, 짧은 체류 회전 전략이 잘 맞습니다.",
    afternoon: "오후형 상권은 디저트, 공부, 브런치, 장시간 체류 좌석 전략을 강화하는 것이 좋습니다.",
    evening: "저녁형 상권은 데이트, 모임, 디저트, 프리미엄 음료 구성을 강조하기 좋습니다.",
    night: "심야형 상권은 제한 메뉴와 효율적인 인력 운영으로 집중 수요에 대응하는 전략이 필요합니다.",
  };
  const genericGuides = {
    dawn: `${categoryText.businessTerm} 새벽 수요는 빠른 결제, 포장 동선, 안정적인 운영 인력이 중요합니다.`,
    morning: `${categoryText.businessTerm} 오전형 상권은 출근·등교 동선과 빠른 제공 속도에 맞춘 운영이 유리합니다.`,
    lunch: `${categoryText.businessTerm} 점심형 상권은 피크 시간 회전율, 대표 메뉴 집중, 대기 동선 관리가 중요합니다.`,
    afternoon: `${categoryText.businessTerm} 오후형 상권은 간식·휴식 수요와 재방문을 유도할 메뉴 구성이 잘 맞습니다.`,
    evening: `${categoryText.businessTerm} 저녁형 상권은 모임, 퇴근 후 식사, 포장·배달 수요를 함께 고려하는 전략이 좋습니다.`,
    night: `${categoryText.businessTerm} 심야형 상권은 제한 메뉴, 포장·배달 대응, 효율적인 인력 운영이 필요합니다.`,
  };

  return (isCafe ? cafeGuides : genericGuides)[timeOption.value];
}

function getCategoryDisplay(category) {
  if (!category) {
    return {
      label: "업종",
      name: "업종",
      businessTerm: "업종 매장",
      conversionLabel: "업종전환효율",
    };
  }

  const label = category.label || category.name || "업종";
  const name = category.name || label;
  const compactName = name.replace(/\s+/g, "");

  if (
    category.code === "COFFEE_BEVERAGE" ||
    category.code === "CS100010" ||
    label === "커피-음료" ||
    compactName === "커피-음료"
  ) {
    return {
      label: "커피-음료",
      name: "커피-음료",
      businessTerm: "카페",
      conversionLabel: "카페전환효율",
    };
  }

  const termByLabel = {
    한식: "한식 음식점",
    중식: "중식 음식점",
    일식: "일식 음식점",
    양식: "양식 음식점",
    분식: "분식 전문점",
    치킨: "치킨 전문점",
    패스트푸드: "패스트푸드점",
    제과점: "제과점",
    편의점: "편의점",
  };
  const businessTerm =
    termByLabel[label] ||
    compactName
      .replace("한식음식점", "한식 음식점")
      .replace("중식음식점", "중식 음식점")
      .replace("일식음식점", "일식 음식점")
      .replace("양식음식점", "양식 음식점")
      .replace("분식전문점", "분식 전문점")
      .replace("치킨전문점", "치킨 전문점") ||
    label;

  return {
    label,
    name,
    businessTerm,
    conversionLabel: `${businessTerm} 전환효율`,
  };
}

function buildRuleBasedReasons(area, scored, timeOption, stats, category) {
  const reasons = [];
  const categoryText = getCategoryDisplay(category);

  if (area.cafeConversionRate >= stats.highCafeConversionRate) {
    reasons.push(
      `유동인구 대비 ${categoryText.businessTerm} 구매 전환효율이 높아 실제 ${categoryText.businessTerm} 소비가 활발한 지역입니다.`
    );
  }

  if (area.mzSalesRatio >= stats.avgMzSalesRatio) {
    reasons.push(
      `선택한 타깃 연령대의 매출비율이 높아 해당 고객층을 겨냥한 ${categoryText.businessTerm}에 적합합니다.`
    );
  }

  if (scored.selectedTimeSalesRatio >= area.peakTimeSalesRatio * 0.9) {
    reasons.push(`선택한 ${timeOption.label} 시간대가 이 지역의 피크 매출 시간대와 가깝습니다.`);
  } else if (scored.selectedTimeSalesRatio >= 0.18) {
    reasons.push(`선택한 ${timeOption.label} 시간대의 ${categoryText.businessTerm} 매출비중이 높아 해당 시간대 운영에 유리합니다.`);
  }

  if (area.averageOrderValue >= stats.avgAverageOrderValue) {
    reasons.push("평균 객단가가 비교적 높아 디저트·프리미엄 메뉴 전략을 고려할 수 있습니다.");
  }

  if (area.mzPopulationRatio >= 0.35) {
    reasons.push("선택한 타깃 연령대의 유동인구 비율이 높아 반복 방문 수요를 기대할 수 있습니다.");
  }

  if (reasons.length < 2) {
    reasons.push("수요, 전환효율, 선택 시간대 매출 지표가 균형 있게 나타나는 상권입니다.");
  }

  return reasons.slice(0, 4);
}

function buildFallbackAiReason(item, timeOption) {
  const targetSalesRatio = item.metrics.targetSalesRatio ?? item.metrics.mzSalesRatio;
  const conversionRate =
    item.metrics.categoryConversionRate ?? item.metrics.conversionRate ?? item.metrics.cafeConversionRate;
  const averagePrice = item.metrics.averagePrice ?? item.metrics.averageOrderValue;
  const categoryText = getCategoryDisplay(item.category);
  const cautionText =
    item.cautions && item.cautions.length > 0
      ? ` 데이터 해석 시 ${item.cautions[0]}`
      : "";

  return `${item.areaName}은 ${categoryText.businessTerm} 기준으로 ${timeOption.label} 시간대 추천점수 ${item.score}점을 기록했습니다. 타깃 매출비율은 ${(targetSalesRatio * 100).toFixed(1)}%, ${categoryText.conversionLabel}은 ${(conversionRate * 100).toFixed(2)}%, 선택 시간대 매출비중은 ${(item.metrics.selectedTimeSalesRatio * 100).toFixed(1)}%, 객단가는 ${averagePrice}원입니다. ${item.reasons.join(" ")}${cautionText} ${item.strategyGuide}`;
}

function buildPrompt(item, timeOption) {
  const targetSalesRatio = item.metrics.targetSalesRatio ?? item.metrics.mzSalesRatio;
  const conversionRate =
    item.metrics.categoryConversionRate ?? item.metrics.conversionRate ?? item.metrics.cafeConversionRate;
  const averagePrice = item.metrics.averagePrice ?? item.metrics.averageOrderValue;
  const categoryText = getCategoryDisplay(item.category);

  return [
    `너는 ${categoryText.businessTerm} 창업 상권 분석가다.`,
    "추천 순위와 수치는 절대 바꾸지 말고, 제공된 지표만 근거로 한국어 설명을 작성해라.",
    `선택 업종은 '${categoryText.label}'이고 실제 설명에서는 '${categoryText.businessTerm}' 표현을 사용해라.`,
    "커피-음료 업종일 때만 자연스럽게 '카페'라는 표현을 사용하고, 다른 업종에는 '카페'라는 단어를 쓰지 마라.",
    `행정동명은 반드시 '${item.areaName}' 그대로 사용하고, 영어식 표기나 번역으로 바꾸지 마라.`,
    "출력은 3문장 이내로 작성한다.",
    "",
    `행정동명: ${item.areaName}`,
    `선택 업종 코드: ${item.category?.code || "unknown"}`,
    `선택 업종 라벨: ${categoryText.label}`,
    `선택 업종명: ${categoryText.name}`,
    `설명용 업종 표현: ${categoryText.businessTerm}`,
    `선택 시간대: ${timeOption.label} (${timeOption.range})`,
    `추천점수: ${item.score}`,
    `타깃 매출비율: ${(targetSalesRatio * 100).toFixed(1)}%`,
    `${categoryText.conversionLabel}: ${(conversionRate * 100).toFixed(2)}%`,
    `선택시간대 매출비중: ${(item.metrics.selectedTimeSalesRatio * 100).toFixed(1)}%`,
    `선택시간대 유동인구비중: ${item.metrics.selectedTimePopulationRatio === null || item.metrics.selectedTimePopulationRatio === undefined ? "데이터 없음" : `${(item.metrics.selectedTimePopulationRatio * 100).toFixed(1)}%`}`,
    `객단가: ${averagePrice}원`,
    `데이터 신뢰도: ${item.dataQuality ? `${item.dataQuality.grade} (${item.dataQuality.score}점)` : "데이터 없음"}`,
    `주의할 점: ${item.cautions?.join(" ") || "큰 경고 없음"}`,
    `기본 추천 사유: ${item.reasons.join(" ")}`,
    `운영 전략: ${item.strategyGuide}`,
  ].join("\n");
}

function getExplanationProvider() {
  const explicitProvider = String(process.env.EXPLANATION_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (explicitProvider === "openai") {
    return "openai";
  }
  if (explicitProvider === "ollama" || explicitProvider === "local-llm") {
    return "ollama";
  }
  if (explicitProvider === "rule") {
    return "rule";
  }

  const provider = String(
    process.env.LLM_PROVIDER || process.env.EXPLANATION_MODE || "openai"
  ).toLowerCase();

  if (provider.includes("ollama") || provider.includes("local")) {
    return "ollama";
  }
  if (provider.includes("rule")) {
    return "rule";
  }
  return "openai";
}

function getAiConfig() {
  const provider = getExplanationProvider();
  return {
    provider,
    mode: provider,
    model: provider === "ollama" ? LOCAL_LLM_MODEL : OPENAI_MODEL,
    usedFallback: provider === "rule",
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openAiApiUrl: OPENAI_API_URL,
  };
}

function extractOpenAiText(data) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  return "";
}

function logOpenAiResponse(data) {
  if (hasLoggedOpenAiResponse) {
    return;
  }

  hasLoggedOpenAiResponse = true;
  console.log("[OPENAI RESPONSE]");
  console.log(JSON.stringify(data, null, 2));
}

async function callOpenAi(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "너는 상권 추천 설명 도우미다. 제공된 정량 지표만 사용하고, 순위와 점수를 새로 만들거나 바꾸지 마라.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 160)}`);
    }

    const data = await response.json();
    logOpenAiResponse(data);

    const text = extractOpenAiText(data);
    if (!text) {
      throw new Error(`openai chat completion was empty: ${JSON.stringify(data)}`);
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callLocalLlm(prompt) {
  const response = await fetch(LOCAL_LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_LLM_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  return String(data.response || "").trim();
}

async function buildAiReason(item, timeOption, enabled) {
  if (!enabled) {
    return {
      mode: "rule",
      text: buildFallbackAiReason(item, timeOption),
    };
  }

  const provider = getExplanationProvider();
  if (provider === "rule") {
    return {
      mode: "rule",
      provider,
      model: null,
      text: buildFallbackAiReason(item, timeOption),
    };
  }

  try {
    const prompt = buildPrompt(item, timeOption);
    const text = provider === "ollama" ? await callLocalLlm(prompt) : await callOpenAi(prompt);
    if (!text) {
      throw new Error(`${provider} response was empty`);
    }
    return {
      mode: provider === "ollama" ? "local-llm" : "openai",
      provider,
      model: provider === "ollama" ? LOCAL_LLM_MODEL : OPENAI_MODEL,
      text,
    };
  } catch (error) {
    return {
      mode: "rule-fallback",
      provider,
      model: provider === "ollama" ? LOCAL_LLM_MODEL : OPENAI_MODEL,
      text: buildFallbackAiReason(item, timeOption),
      error: error.message,
    };
  }
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPercentLabel(value, digits = 1) {
  const number = toFiniteNumber(value);
  if (number === null) {
    return "추가 확인 필요";
  }
  return `${(number * 100).toFixed(digits)}%`;
}

function toScoreLabel(value) {
  const number = toFiniteNumber(value);
  if (number === null) {
    return "추가 확인 필요";
  }
  return `${number.toFixed(1)}점`;
}

function toList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item));
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return fallback;
}

function toText(value, fallback) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function getStructuredCategoryDisplay(category) {
  const code = category?.code || "";
  const label = category?.label || category?.name || "업종";
  const name = category?.name || label;

  const termByCode = {
    COFFEE_BEVERAGE: "카페",
    KOREAN_FOOD: "한식 음식점",
    CHINESE_FOOD: "중식 음식점",
    JAPANESE_FOOD: "일식 음식점",
    WESTERN_FOOD: "양식 음식점",
    SNACK_FOOD: "분식 전문점",
    CHICKEN: "치킨 전문점",
    BAKERY: "제과점",
    FAST_FOOD: "패스트푸드점",
    CONVENIENCE_STORE: "편의점",
  };

  const termByLabel = {
    "커피-음료": "카페",
    한식: "한식 음식점",
    중식: "중식 음식점",
    일식: "일식 음식점",
    양식: "양식 음식점",
    분식: "분식 전문점",
    치킨: "치킨 전문점",
    제과점: "제과점",
    패스트푸드: "패스트푸드점",
    편의점: "편의점",
  };

  const businessTerm = termByCode[code] || termByLabel[label] || `${label} 매장`;
  return {
    code,
    label,
    name,
    businessTerm,
    conversionLabel: businessTerm === "카페" ? "카페전환효율" : `${businessTerm} 전환효율`,
  };
}

function pickConversionRate(metrics = {}) {
  return (
    metrics.categoryConversionRate ??
    metrics.conversionRate ??
    metrics.cafeConversionRate ??
    null
  );
}

function pickAveragePrice(metrics = {}) {
  return metrics.averageOrderValue ?? metrics.averagePrice ?? null;
}

function decideFinalOpinion(dataQuality = {}, cautions = []) {
  const qualityScore = toFiniteNumber(dataQuality.score);
  if (qualityScore !== null && qualityScore < 55) {
    return "주의 필요";
  }
  if (cautions.length >= 2) {
    return "주의 필요";
  }
  if (qualityScore !== null && qualityScore >= 75 && cautions.length === 0) {
    return "적극 검토";
  }
  return "보통";
}

function parseJsonOnlyResponse(text) {
  if (!text || !String(text).trim()) {
    throw new Error("ai response was empty");
  }

  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw firstError;
    }
    return JSON.parse(jsonMatch[0]);
  }
}

function buildJsonPrompt({ taskName, responseSchema, payload }) {
  return [
    `작업명: ${taskName}`,
    "",
    "역할: 너는 상권 추천 결과를 설명하는 AI 분석 도우미다.",
    "중요 규칙:",
    "- 추천 점수, 순위, scoreBreakdown 값을 새로 계산하거나 수정하지 않는다.",
    "- 제공된 JSON 데이터 안에 있는 값만 근거로 사용한다.",
    "- 임대료, 경쟁 점포 수, 실제 입지, 유동 동선, 브랜드 적합성처럼 제공되지 않은 정보는 추측하지 않는다.",
    "- 없는 정보는 반드시 '추가 확인 필요'라고 표현한다.",
    "- 결과는 설명 문장만 담은 JSON 객체로만 반환한다. Markdown, 코드블록, 주석은 넣지 않는다.",
    "- 배열 필드는 한국어 문장 2~4개로 간결하게 작성한다.",
    "",
    "반환 JSON 스키마:",
    JSON.stringify(responseSchema, null, 2),
    "",
    "입력 데이터:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function buildStructuredOpenAiResponse({ prompt, fallback, resultKey, normalize }) {
  const provider = getExplanationProvider();
  const model = provider === "ollama" ? LOCAL_LLM_MODEL : OPENAI_MODEL;

  if (provider !== "openai") {
    return {
      mode: "rule-fallback",
      provider,
      model,
      [resultKey]: fallback,
    };
  }

  try {
    const text = await callOpenAi(prompt);
    const parsed = parseJsonOnlyResponse(text);
    const payload = parsed?.[resultKey] || parsed;
    return {
      mode: "openai",
      provider,
      model,
      [resultKey]: normalize(payload, fallback),
    };
  } catch (error) {
    return {
      mode: "rule-fallback",
      provider,
      model,
      [resultKey]: fallback,
      error: error.message,
    };
  }
}

function buildAreaReportFallback(input = {}) {
  const context = input.context || {};
  const categoryText = getStructuredCategoryDisplay(context.category);
  const metrics = context.metrics || {};
  const dataQuality = context.dataQuality || {};
  const cautions = toList(context.cautions);
  const conversionRate = pickConversionRate(metrics);
  const targetSalesRatio = metrics.targetSalesRatio ?? metrics.mzSalesRatio;
  const selectedTimeSalesRatio = metrics.selectedTimeSalesRatio;
  const targetPopulation = metrics.targetPopulation;
  const averagePrice = pickAveragePrice(metrics);
  const qualityScore = toFiniteNumber(dataQuality.score);
  const finalOpinion = decideFinalOpinion(dataQuality, cautions);

  const strengths = [];
  if (toFiniteNumber(targetSalesRatio) !== null) {
    strengths.push(`타깃 매출비율은 ${toPercentLabel(targetSalesRatio)}로, 선택 업종의 핵심 고객 수요를 판단할 수 있는 지표입니다.`);
  }
  if (toFiniteNumber(targetPopulation) !== null) {
    strengths.push(`타깃 유동인구 규모는 ${Math.round(Number(targetPopulation)).toLocaleString("ko-KR")}명으로 확인됩니다.`);
  }
  if (toFiniteNumber(conversionRate) !== null) {
    strengths.push(`${categoryText.conversionLabel}은 ${toPercentLabel(conversionRate, 2)}입니다.`);
  }
  if (toFiniteNumber(selectedTimeSalesRatio) !== null) {
    strengths.push(`선택 시간대 매출비중은 ${toPercentLabel(selectedTimeSalesRatio)}입니다.`);
  }
  if (strengths.length === 0) {
    strengths.push("제공된 정량 지표만으로는 강점을 단정하기 어려워 추가 확인이 필요합니다.");
  }

  const risks = cautions.length
    ? cautions
    : [
        qualityScore !== null && qualityScore < 70
          ? "데이터 신뢰도 점수가 낮아 현장 검증을 함께 진행해야 합니다."
          : "임대료, 경쟁 점포 수, 실제 유동 동선은 제공되지 않아 추가 확인이 필요합니다.",
      ];

  return {
    summary: `${categoryText.businessTerm} 기준으로 제공된 추천 점수는 ${toScoreLabel(context.score)}이며, 데이터 신뢰도는 ${dataQuality.grade || "등급 추가 확인 필요"} ${qualityScore ?? "추가 확인 필요"}점입니다. AI는 이 값을 재계산하지 않고 해석만 제공합니다.`,
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    operationStrategy: [
      `선택 시간대(${context.selectedTime || "추가 확인 필요"})의 매출비중을 기준으로 인력과 재고를 우선 배치합니다.`,
      `${categoryText.businessTerm} 운영에 필요한 피크 시간 대응 전략은 실제 현장 동선 확인 후 확정하는 것이 좋습니다.`,
      averagePrice !== null
        ? `객단가 ${Math.round(Number(averagePrice)).toLocaleString("ko-KR")}원을 기준으로 가격대와 세트 구성을 점검합니다.`
        : "객단가 정보가 부족하면 메뉴 가격대는 추가 확인이 필요합니다.",
    ],
    targetStrategy: [
      `타깃 연령대(${toList(context.targetAges).join(", ") || "추가 확인 필요"})의 매출비율과 유동인구 규모를 함께 봐야 합니다.`,
      "타깃 고객의 실제 방문 목적, 체류 시간, 결제 패턴은 제공 데이터 밖의 정보이므로 현장 확인이 필요합니다.",
    ],
    fieldChecklist: [
      "임대료와 권리금: 추가 확인 필요",
      "동일 업종 경쟁 점포 수: 추가 확인 필요",
      "출퇴근/점심/저녁 실제 보행 동선: 추가 확인 필요",
      "배달·포장 수요와 매장 접근성: 추가 확인 필요",
    ],
    finalOpinion,
  };
}

function normalizeAreaReport(value = {}, fallback) {
  return {
    summary: toText(value.summary, fallback.summary),
    strengths: toList(value.strengths, fallback.strengths),
    risks: toList(value.risks, fallback.risks),
    operationStrategy: toList(value.operationStrategy, fallback.operationStrategy),
    targetStrategy: toList(value.targetStrategy, fallback.targetStrategy),
    fieldChecklist: toList(value.fieldChecklist, fallback.fieldChecklist),
    finalOpinion: toText(value.finalOpinion, fallback.finalOpinion),
  };
}

async function buildAreaReport(input = {}) {
  const fallback = buildAreaReportFallback(input);
  const responseSchema = {
    report: {
      summary: "string",
      strengths: ["string"],
      risks: ["string"],
      operationStrategy: ["string"],
      targetStrategy: ["string"],
      fieldChecklist: ["string"],
      finalOpinion: "적극 검토 | 보통 | 주의 필요",
    },
  };
  const prompt = buildJsonPrompt({
    taskName: "AI 상권 분석 리포트",
    responseSchema,
    payload: {
      areaFeatureId: input.areaFeatureId,
      recommendationResultId: input.recommendationResultId || null,
      context: input.context || {},
    },
  });

  return buildStructuredOpenAiResponse({
    prompt,
    fallback,
    resultKey: "report",
    normalize: normalizeAreaReport,
  });
}

function getItemName(item) {
  return item?.districtName || item?.areaName || item?.name || "상권";
}

function pickBestItem(items, picker) {
  return items.reduce((best, item) => {
    const value = toFiniteNumber(picker(item));
    const bestValue = best ? toFiniteNumber(picker(best)) : null;
    if (value === null) {
      return best;
    }
    if (!best || bestValue === null || value > bestValue) {
      return item;
    }
    return best;
  }, null);
}

function buildCompareSummaryFallback(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    return {
      overall: "비교 항목이 없어 AI 비교 요약을 만들 수 없습니다.",
      bestForStableChoice: "추가 확인 필요",
      bestForTargetDemand: "추가 확인 필요",
      bestForPremiumStrategy: "추가 확인 필요",
      risks: ["비교할 상권을 먼저 추가해야 합니다."],
      finalRecommendation: "비교 항목을 2개 이상 추가한 뒤 다시 확인하세요.",
    };
  }

  const bestScore = pickBestItem(items, (item) => item.score);
  const bestStable = pickBestItem(items, (item) => item.dataQuality?.score);
  const bestTarget = pickBestItem(items, (item) => item.metrics?.targetSalesRatio);
  const bestPremium = pickBestItem(items, (item) => pickAveragePrice(item.metrics || {}));
  const risks = items
    .flatMap((item) => toList(item.cautions))
    .concat(
      items
        .filter((item) => toFiniteNumber(item.dataQuality?.score) !== null && Number(item.dataQuality.score) < 60)
        .map((item) => `${getItemName(item)}은 데이터 신뢰도 점수가 낮아 추가 확인이 필요합니다.`)
    );

  return {
    overall: `${items.length}개 상권을 비교했습니다. AI는 제공된 추천 점수와 지표를 재계산하지 않고, 각 상권의 강점 차이만 요약합니다.`,
    bestForStableChoice: bestStable
      ? `${getItemName(bestStable)}: 데이터 신뢰도 ${bestStable.dataQuality?.score ?? "추가 확인 필요"}점으로 안정적 선택 관점에서 우선 검토할 수 있습니다.`
      : "데이터 신뢰도 정보가 부족해 안정적 선택지는 추가 확인이 필요합니다.",
    bestForTargetDemand: bestTarget
      ? `${getItemName(bestTarget)}: 타깃 매출비율 ${toPercentLabel(bestTarget.metrics?.targetSalesRatio)} 기준으로 타깃 수요 관점에서 강점이 있습니다.`
      : "타깃 매출비율 정보가 부족해 타깃 수요 판단은 추가 확인이 필요합니다.",
    bestForPremiumStrategy: bestPremium
      ? `${getItemName(bestPremium)}: 객단가 ${Math.round(Number(pickAveragePrice(bestPremium.metrics || {}))).toLocaleString("ko-KR")}원 기준으로 프리미엄 전략 검토 여지가 있습니다.`
      : "객단가 정보가 부족해 프리미엄 전략 적합성은 추가 확인이 필요합니다.",
    risks: risks.length
      ? Array.from(new Set(risks)).slice(0, 4)
      : ["임대료, 경쟁 점포 수, 실제 입지는 제공되지 않아 추가 확인이 필요합니다."],
    finalRecommendation: bestScore
      ? `${getItemName(bestScore)}가 제공된 추천 점수 기준으로 가장 앞서지만, 최종 선택 전 현장 조건을 함께 확인해야 합니다.`
      : "추천 점수 정보가 부족해 최종 판단은 추가 확인이 필요합니다.",
  };
}

function normalizeCompareSummary(value = {}, fallback) {
  return {
    overall: toText(value.overall, fallback.overall),
    bestForStableChoice: toText(value.bestForStableChoice, fallback.bestForStableChoice),
    bestForTargetDemand: toText(value.bestForTargetDemand, fallback.bestForTargetDemand),
    bestForPremiumStrategy: toText(value.bestForPremiumStrategy, fallback.bestForPremiumStrategy),
    risks: toList(value.risks, fallback.risks),
    finalRecommendation: toText(value.finalRecommendation, fallback.finalRecommendation),
  };
}

async function buildCompareSummary(input = {}) {
  const fallback = buildCompareSummaryFallback(input);
  const responseSchema = {
    summary: {
      overall: "string",
      bestForStableChoice: "string",
      bestForTargetDemand: "string",
      bestForPremiumStrategy: "string",
      risks: ["string"],
      finalRecommendation: "string",
    },
  };
  const prompt = buildJsonPrompt({
    taskName: "AI 비교 요약",
    responseSchema,
    payload: {
      comparisonId: input.comparisonId || null,
      items: Array.isArray(input.items) ? input.items : [],
    },
  });

  return buildStructuredOpenAiResponse({
    prompt,
    fallback,
    resultKey: "summary",
    normalize: normalizeCompareSummary,
  });
}

function buildReliabilityExplanationFallback(input = {}) {
  const categoryText = getStructuredCategoryDisplay(input.category);
  const dataQuality = input.dataQuality || {};
  const cautions = toList(input.cautions);
  const qualityScore = toFiniteNumber(dataQuality.score);
  const reliabilityFactor = toFiniteNumber(input.reliabilityFactor);
  const baseScore = toFiniteNumber(input.baseScore);
  const score = toFiniteNumber(input.score);
  const scoreGap =
    baseScore !== null && score !== null ? Math.max(0, baseScore - score) : null;

  const whyLowOrHigh = [];
  if (qualityScore !== null) {
    whyLowOrHigh.push(
      qualityScore >= 75
        ? "매출건수, 유동인구, 타깃 유동인구, 매출 안정성 등 주요 검증 지표가 비교적 안정적으로 반영되었습니다."
        : "데이터 신뢰도 점수가 낮아 추천 점수 해석 시 보수적으로 봐야 합니다."
    );
  }
  if (reliabilityFactor !== null) {
    whyLowOrHigh.push(`신뢰도 보정계수는 ${reliabilityFactor.toFixed(3)}이며, 이는 기본 추천점수에 적용된 보수적 보정 수준입니다.`);
  }
  if (scoreGap !== null && scoreGap > 0) {
    whyLowOrHigh.push(`기본점수 대비 최종점수가 약 ${scoreGap.toFixed(1)}점 낮아져 데이터 품질 리스크가 반영되었습니다.`);
  }
  if (cautions.length) {
    whyLowOrHigh.push(...cautions.slice(0, 2));
  }
  if (whyLowOrHigh.length === 0) {
    whyLowOrHigh.push("신뢰도 판단에 필요한 세부 지표가 부족해 추가 확인이 필요합니다.");
  }

  return {
    plainSummary: `${input.districtName || "해당 상권"}의 ${categoryText.businessTerm} 추천 결과는 신뢰도 ${qualityScore ?? "추가 확인 필요"}점 기준으로 해석해야 합니다. AI는 점수를 새로 계산하지 않고 기존 보정 결과를 설명합니다.`,
    whyLowOrHigh: whyLowOrHigh.slice(0, 4),
    whatToCheck: [
      "총 매출건수와 총 유동인구 규모가 충분한지 확인",
      "타깃 유동인구 규모가 실제 고객층과 맞는지 확인",
      "분기별 매출 안정성이 특정 기간에 치우치지 않았는지 확인",
      "전환효율 이상치 여부와 현장 경쟁 상황은 추가 확인 필요",
    ],
    interpretationGuide: "데이터 신뢰도는 추천 점수의 확신도를 뜻합니다. 점수가 낮아도 후보에서 바로 제외하기보다는 임대료, 경쟁 점포, 실제 동선 같은 현장 정보를 추가로 확인한 뒤 판단하는 것이 좋습니다.",
  };
}

function normalizeReliabilityExplanation(value = {}, fallback) {
  return {
    plainSummary: toText(value.plainSummary, fallback.plainSummary),
    whyLowOrHigh: toList(value.whyLowOrHigh, fallback.whyLowOrHigh),
    whatToCheck: toList(value.whatToCheck, fallback.whatToCheck),
    interpretationGuide: toText(value.interpretationGuide, fallback.interpretationGuide),
  };
}

async function buildReliabilityExplanation(input = {}) {
  const fallback = buildReliabilityExplanationFallback(input);
  const responseSchema = {
    explanation: {
      plainSummary: "string",
      whyLowOrHigh: ["string"],
      whatToCheck: ["string"],
      interpretationGuide: "string",
    },
  };
  const prompt = buildJsonPrompt({
    taskName: "데이터 신뢰도 해석 AI",
    responseSchema,
    payload: input,
  });

  return buildStructuredOpenAiResponse({
    prompt,
    fallback,
    resultKey: "explanation",
    normalize: normalizeReliabilityExplanation,
  });
}

module.exports = {
  buildAreaReport,
  buildAiReason,
  buildCompareSummary,
  buildReliabilityExplanation,
  buildRuleBasedReasons,
  getAiConfig,
  getStrategyGuide,
};
