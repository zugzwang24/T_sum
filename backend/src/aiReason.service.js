const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://localhost:11434/api/generate";
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || "llama3.1";
const OPENAI_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);

function getStrategyGuide(timeOption) {
  const guides = {
    dawn: "새벽 시간대는 간단한 메뉴, 포장 동선, 안전한 매장 이미지가 중요합니다.",
    morning: "오전형 상권은 출근길 테이크아웃, 빠른 제조, 커피 세트 운영이 유리합니다.",
    lunch: "점심형 상권은 식후 음료, 가벼운 디저트, 짧은 체류 회전 전략이 잘 맞습니다.",
    afternoon: "오후형 상권은 디저트, 공부, 브런치, 장시간 체류 좌석 전략을 강화하는 것이 좋습니다.",
    evening: "저녁형 상권은 데이트, 모임, 디저트, 프리미엄 음료 구성을 강조하기 좋습니다.",
    night: "심야형 상권은 제한 메뉴와 효율적인 인력 운영으로 집중 수요에 대응하는 전략이 필요합니다.",
  };
  return guides[timeOption.value];
}

function buildRuleBasedReasons(area, scored, timeOption, stats) {
  const reasons = [];

  if (area.cafeConversionRate >= stats.highCafeConversionRate) {
    reasons.push("유동인구 대비 카페 구매 전환효율이 높아 실제 카페 소비가 활발한 지역입니다.");
  }

  if (area.mzSalesRatio >= stats.avgMzSalesRatio) {
    reasons.push("선택한 타깃 연령대의 매출비율이 높아 해당 고객층을 겨냥한 카페에 적합합니다.");
  }

  if (scored.selectedTimeSalesRatio >= area.peakTimeSalesRatio * 0.9) {
    reasons.push(`선택한 ${timeOption.label} 시간대가 이 지역의 피크 매출 시간대와 가깝습니다.`);
  } else if (scored.selectedTimeSalesRatio >= 0.18) {
    reasons.push(`선택한 ${timeOption.label} 시간대의 카페 매출비중이 높아 해당 시간대 운영에 유리합니다.`);
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
  const conversionRate = item.metrics.conversionRate ?? item.metrics.cafeConversionRate;
  const averagePrice = item.metrics.averagePrice ?? item.metrics.averageOrderValue;
  const cautionText =
    item.cautions && item.cautions.length > 0
      ? ` 데이터 해석 시 ${item.cautions[0]}`
      : "";

  return `${item.areaName}은 ${timeOption.label} 시간대 기준 추천점수 ${item.score}점을 기록했습니다. 타깃 매출비율은 ${(targetSalesRatio * 100).toFixed(1)}%, 카페전환효율은 ${(conversionRate * 100).toFixed(2)}%, 선택 시간대 매출비중은 ${(item.metrics.selectedTimeSalesRatio * 100).toFixed(1)}%, 객단가는 ${averagePrice}원입니다. ${item.reasons.join(" ")}${cautionText} ${item.strategyGuide}`;
}

function buildPrompt(item, timeOption) {
  const targetSalesRatio = item.metrics.targetSalesRatio ?? item.metrics.mzSalesRatio;
  const conversionRate = item.metrics.conversionRate ?? item.metrics.cafeConversionRate;
  const averagePrice = item.metrics.averagePrice ?? item.metrics.averageOrderValue;

  return [
    "너는 카페 창업 상권 분석가다.",
    "추천 순위와 수치는 절대 바꾸지 말고, 제공된 지표만 근거로 한국어 설명을 작성해라.",
    `행정동명은 반드시 '${item.areaName}' 그대로 사용하고, 영어식 표기나 번역으로 바꾸지 마라.`,
    "출력은 3문장 이내로 작성한다.",
    "",
    `행정동명: ${item.areaName}`,
    `선택 시간대: ${timeOption.label} (${timeOption.range})`,
    `추천점수: ${item.score}`,
    `타깃 매출비율: ${(targetSalesRatio * 100).toFixed(1)}%`,
    `카페전환효율: ${(conversionRate * 100).toFixed(2)}%`,
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
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const firstContentText = data.output?.[0]?.content?.[0]?.text;
  if (typeof firstContentText === "string" && firstContentText.trim()) {
    return firstContentText.trim();
  }

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
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
        instructions:
          "너는 카페 창업 상권 분석가다. 제공된 정량 지표만 사용하고, 순위와 점수를 새로 만들거나 바꾸지 마라.",
        input: prompt,
        max_output_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 160)}`);
    }

    const data = await response.json();
    return extractOpenAiText(data);
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

module.exports = {
  buildAiReason,
  buildRuleBasedReasons,
  getAiConfig,
  getStrategyGuide,
};
