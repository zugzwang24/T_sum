const API_BASE_URL = (
  window.API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://t-sum.onrender.com/api")
).replace(/\/$/, "");
const h = React.createElement;

const TIME_OPTIONS = [
  { value: "dawn", label: "새벽", range: "00~06" },
  { value: "morning", label: "오전", range: "06~11" },
  { value: "lunch", label: "점심", range: "11~14" },
  { value: "afternoon", label: "오후", range: "14~17" },
  { value: "evening", label: "저녁", range: "17~21" },
  { value: "night", label: "심야", range: "21~24" },
];

const AGE_OPTIONS = [
  { value: "10", label: "10대" },
  { value: "20", label: "20대" },
  { value: "30", label: "30대" },
  { value: "40", label: "40대" },
  { value: "50", label: "50대" },
  { value: "60", label: "60대+" },
];

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

function MetricBadge({ label, value }) {
  return h(
    "div",
    { className: "metric-badge" },
    h("span", null, label),
    h("strong", null, value)
  );
}

function DataQualityBadge({ quality }) {
  if (!quality) {
    return null;
  }

  return h(
    "div",
    { className: `quality-badge grade-${quality.grade}` },
    h("span", null, "신뢰도"),
    h("strong", null, `${quality.grade} · ${quality.score}점`)
  );
}

function CautionList({ cautions }) {
  if (!cautions || cautions.length === 0) {
    return null;
  }

  return h(
    "div",
    { className: "caution-box" },
    h("strong", null, "주의할 점"),
    h(
      "ul",
      null,
      cautions.map((caution) => h("li", { key: caution }, caution))
    )
  );
}

function TimeSelector({ selectedTime, onChange }) {
  return h(
    "div",
    { className: "time-selector" },
    TIME_OPTIONS.map((option) =>
      h(
        "button",
        {
          key: option.value,
          className: selectedTime === option.value ? "active" : "",
          onClick: () => onChange(option.value),
        },
        h("strong", null, option.label),
        h("span", null, option.range)
      )
    )
  );
}

function TargetAgeSelector({ selectedAges, onChange }) {
  function toggleAge(age) {
    if (selectedAges.includes(age)) {
      const next = selectedAges.filter((item) => item !== age);
      onChange(next.length > 0 ? next : ["20", "30"]);
      return;
    }
    onChange([...selectedAges, age].sort((a, b) => Number(a) - Number(b)));
  }

  return h(
    "div",
    { className: "age-selector" },
    AGE_OPTIONS.map((option) =>
      h(
        "button",
        {
          key: option.value,
          className: selectedAges.includes(option.value) ? "active" : "",
          onClick: () => toggleAge(option.value),
        },
        option.label
      )
    )
  );
}

function ScoreBreakdown({ breakdown }) {
  const rows = [
    ["전환효율", breakdown.cafeConversionRate],
    ["타깃 매출", breakdown.mzSalesRatio],
    ["선택 시간", breakdown.selectedTimeSalesRatio],
    ["객단가", breakdown.averageOrderValue],
  ];

  return h(
    "div",
    { className: "breakdown" },
    rows.map(([label, value]) =>
      h(
        "div",
        { className: "breakdown-row", key: label },
        h("span", null, label),
        h("div", { className: "bar-track" }, h("div", { className: "bar-fill", style: { width: `${Math.max(value, 2)}%` } })),
        h("strong", null, value.toFixed(1))
      )
    )
  );
}

function RecommendationCard({ item, selected, checked, onSelect, onToggleCompare }) {
  return h(
    "article",
    { className: `recommend-card ${selected ? "selected" : ""}` },
    h(
      "button",
      { className: "card-main", onClick: () => onSelect(item.areaCode) },
      h("span", { className: "rank" }, item.rank),
      h(
        "span",
        { className: "card-title" },
        h("strong", null, item.areaName),
        h("small", null, `행정동 코드 ${item.areaCode}`)
      ),
      h("span", { className: "score" }, item.score.toFixed(1))
    ),
    h(
      "div",
      { className: "card-metrics" },
      h(MetricBadge, { label: "타깃 매출비율", value: formatPercent(item.metrics.targetSalesRatio ?? item.metrics.mzSalesRatio) }),
      h(MetricBadge, { label: "카페전환효율", value: formatPercent(item.metrics.cafeConversionRate, 2) }),
      h(MetricBadge, { label: "선택시간 매출", value: formatPercent(item.metrics.selectedTimeSalesRatio) }),
      h(MetricBadge, { label: "선택시간 유동", value: formatPercent(item.metrics.selectedTimePopulationRatio) }),
      h(MetricBadge, { label: "객단가", value: `${formatNumber(item.metrics.averageOrderValue)}원` })
    ),
    h(DataQualityBadge, { quality: item.dataQuality }),
    h(
      "ul",
      { className: "reason-list" },
      item.reasons.map((reason) => h("li", { key: reason }, reason))
    ),
    h(
      "div",
      { className: "card-actions" },
      h(
        "button",
        { className: "ghost", onClick: () => onSelect(item.areaCode) },
        "상세 보기"
      ),
      h(
        "button",
        {
          className: checked ? "compare-on" : "ghost",
          onClick: () => onToggleCompare(item.areaCode),
        },
        checked ? "비교에 추가됨" : "비교 추가"
      )
    )
  );
}

function getAiReasonTitle(aiReason, useAi) {
  if (!aiReason) {
    return useAi ? "로컬 LLM 해설" : "데이터 기반 해설";
  }
  if (aiReason.mode === "local-llm") {
    return "로컬 LLM 해설 완료";
  }
  if (aiReason.mode === "rule-fallback") {
    return "로컬 LLM 연결 실패 - 규칙 기반 해설";
  }
  return "데이터 기반 해설";
}

function getAiReasonBadge(aiReason, useAi) {
  if (!aiReason) {
    return useAi ? "생성 중" : "규칙 기반";
  }
  if (aiReason.mode === "local-llm") {
    return "Ollama 사용";
  }
  if (aiReason.mode === "rule-fallback") {
    return "Fallback";
  }
  return "Rule";
}

function DetailPanel({ detail, loading, useAi }) {
  if (!detail && loading) {
    return h(
      "section",
      { className: "side-panel" },
      h("span", { className: "eyebrow" }, useAi ? "로컬 LLM 해설 생성 중" : "상권 상세"),
      h("p", { className: "muted" }, useAi ? "선택한 상권 데이터를 Ollama에 전달해 해설을 만들고 있습니다." : "상권 상세 지표를 불러오는 중입니다.")
    );
  }

  if (!detail) {
    return h("section", { className: "side-panel" }, h("p", { className: "muted" }, "추천 상권을 선택하면 상세 지표와 해설을 볼 수 있습니다."));
  }

  return h(
    "section",
    { className: "side-panel" },
    h("span", { className: "eyebrow" }, "상권 상세"),
    h("h2", null, detail.areaName),
    h("p", { className: "panel-score" }, `${detail.score.toFixed(1)}점`),
    detail.baseScore &&
      h("p", { className: "score-note" }, `기본점수 ${detail.baseScore.toFixed(1)}점에서 데이터 신뢰도를 반영했습니다.`),
    h(
      "div",
      { className: "metrics-grid" },
      h(MetricBadge, { label: "총 매출금액", value: formatNumber(detail.metrics.totalSalesAmount) }),
      h(MetricBadge, { label: "총 매출건수", value: formatNumber(detail.metrics.totalSalesCount) }),
      h(MetricBadge, { label: "총 유동인구", value: formatNumber(detail.metrics.totalPopulation) }),
      h(MetricBadge, { label: "타깃 유동인구", value: formatNumber(detail.metrics.targetPopulation ?? detail.metrics.mzPopulation) })
    ),
    h(DataQualityBadge, { quality: detail.dataQuality }),
    h(CautionList, { cautions: detail.cautions }),
    h("h3", null, "점수 구성"),
    h(ScoreBreakdown, { breakdown: detail.scoreBreakdown }),
    h("h3", null, "시간대별 매출비중"),
    h(
      "div",
      { className: "time-bars" },
      TIME_OPTIONS.map((option) =>
        h(
          "div",
          { className: "time-bar-row", key: option.value },
          h("span", null, option.label),
          h("div", { className: "bar-track" }, h("div", { className: "bar-fill", style: { width: `${Math.max((detail.timeSalesRatios[option.value] ?? 0) * 100, 2)}%` } })),
          h("strong", null, formatPercent(detail.timeSalesRatios[option.value]))
        )
      )
    ),
    h("h3", null, "운영 전략 가이드"),
    h("p", { className: "strategy" }, detail.strategyGuide),
    h(
      "div",
      { className: `ai-reason detail-ai ${detail.aiReason?.mode === "local-llm" ? "llm-success" : ""}` },
      h(
        "div",
        { className: "ai-reason-head" },
        h("span", null, getAiReasonTitle(detail.aiReason, useAi)),
        h("b", null, getAiReasonBadge(detail.aiReason, useAi))
      ),
      loading && useAi
        ? h("p", null, "로컬 LLM 해설을 다시 생성하는 중입니다. 추천 순위와 점수는 이미 계산된 정량 지표를 그대로 사용합니다.")
        : h("p", null, detail.aiReason?.text ?? "선택한 상권의 지표를 바탕으로 해설을 준비 중입니다."),
      detail.aiReason?.error &&
        h("small", { className: "ai-error" }, `Ollama 응답 실패: ${detail.aiReason.error}`)
    )
  );
}

function ComparePanel({ compare, selectedCodes }) {
  if (selectedCodes.length < 2) {
    return h("section", { className: "compare-panel" }, h("p", { className: "muted" }, "비교할 상권 2개를 선택해주세요."));
  }

  if (!compare) {
    return h("section", { className: "compare-panel" }, h("p", { className: "muted" }, "비교 데이터를 불러오는 중입니다."));
  }

  return h(
    "section",
    { className: "compare-panel" },
    h("h2", null, "상권 비교"),
    h("p", { className: "muted" }, compare.summary),
    h(
      "div",
      { className: "compare-grid" },
      compare.areas.map((area) =>
        h(
          "div",
          { className: "compare-card", key: area.areaCode },
          h("strong", null, area.areaName),
          h("span", null, `${area.score.toFixed(1)}점`),
          h(DataQualityBadge, { quality: area.dataQuality }),
          h(MetricBadge, { label: "타깃 매출비율", value: formatPercent(area.metrics.targetSalesRatio ?? area.metrics.mzSalesRatio) }),
          h(MetricBadge, { label: "타깃 유동비율", value: formatPercent(area.metrics.targetPopulationRatio ?? area.metrics.mzPopulationRatio) }),
          h(MetricBadge, { label: "카페전환효율", value: formatPercent(area.metrics.cafeConversionRate, 2) }),
          h(MetricBadge, { label: "선택시간 매출", value: formatPercent(area.metrics.selectedTimeSalesRatio) }),
          h(MetricBadge, { label: "객단가", value: `${formatNumber(area.metrics.averageOrderValue)}원` })
        )
      )
    )
  );
}

function App() {
  const [selectedTime, setSelectedTime] = React.useState("evening");
  const [recommendations, setRecommendations] = React.useState([]);
  const [criteria, setCriteria] = React.useState(null);
  const [selectedAreaCode, setSelectedAreaCode] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [compareCodes, setCompareCodes] = React.useState([]);
  const [compare, setCompare] = React.useState(null);
  const [status, setStatus] = React.useState("loading");
  const [useAi, setUseAi] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selectedAges, setSelectedAges] = React.useState(["20", "30"]);
  const [useAdjustedScore, setUseAdjustedScore] = React.useState(true);

  async function loadRecommendations(time) {
    setStatus("loading");
    const ages = selectedAges.join(",");
    const data = await fetchJson(`/recommendations?time=${time}&targetAges=${ages}&industry=${encodeURIComponent("커피-음료")}&limit=10&useAdjustedScore=${useAdjustedScore}`);
    setRecommendations(data.items);
    setCriteria(data.criteria);
    setSelectedAreaCode(data.items[0]?.areaCode ?? null);
    setCompareCodes([]);
    setCompare(null);
    setStatus("ready");
  }

  function toggleCompare(areaCode) {
    setCompareCodes((current) => {
      if (current.includes(areaCode)) {
        return current.filter((code) => code !== areaCode);
      }
      return [...current, areaCode].slice(-2);
    });
  }

  React.useEffect(() => {
    loadRecommendations(selectedTime).catch(() => setStatus("error"));
  }, [selectedTime, selectedAges.join(","), useAdjustedScore]);

  React.useEffect(() => {
    if (!selectedAreaCode) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    fetchJson(`/areas/${selectedAreaCode}?time=${selectedTime}&targetAges=${selectedAges.join(",")}&ai=${useAi}&useAdjustedScore=${useAdjustedScore}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedAreaCode, selectedTime, selectedAges.join(","), useAi, useAdjustedScore]);

  React.useEffect(() => {
    if (compareCodes.length !== 2) {
      setCompare(null);
      return;
    }

    fetchJson(`/compare?areaA=${compareCodes[0]}&areaB=${compareCodes[1]}&time=${selectedTime}&targetAges=${selectedAges.join(",")}&useAdjustedScore=${useAdjustedScore}`)
      .then(setCompare)
      .catch(() => setCompare(null));
  }, [compareCodes, selectedTime, selectedAges.join(","), useAdjustedScore]);

  return h(
    "main",
    { className: "app-shell" },
    h(
      "header",
      { className: "hero" },
      h("span", { className: "eyebrow" }, "황금을 찾아라"),
      h("h1", null, "MZ 카페 상권 추천"),
      h("p", null, "서울 공공데이터를 기반으로 2030 수요, 실제 카페 구매 전환, 선택한 운영 시간대, 객단가를 함께 반영해 창업 후보 상권을 추천합니다.")
    ),
    h(
      "section",
      { className: "control-panel" },
      h(
        "div",
        null,
        h("h2", null, "희망 운영 시간대"),
        criteria && h("p", { className: "muted" }, `${criteria.timeLabel} ${criteria.timeRange} · 타깃 ${criteria.targetAges.join(",")}대 · ${criteria.useAdjustedScore ? "이상치 보정" : "원점수"}`),
        h(
          "label",
          { className: "ai-toggle" },
          h("input", {
            type: "checkbox",
            checked: useAdjustedScore,
            onChange: (event) => setUseAdjustedScore(event.target.checked),
          }),
          h("span", null, "이상치 보정 점수 사용")
        ),
        h(
          "label",
          { className: "ai-toggle" },
          h("input", {
            type: "checkbox",
            checked: useAi,
            onChange: (event) => setUseAi(event.target.checked),
          }),
          h("span", null, "상권 클릭 시 로컬 LLM 해설 생성")
        )
      ),
      h(
        "div",
        { className: "selector-stack" },
        h(TimeSelector, { selectedTime, onChange: setSelectedTime }),
        h(TargetAgeSelector, { selectedAges, onChange: setSelectedAges })
      )
    ),
    status === "error" &&
      h("p", { className: "error" }, "백엔드 API에 연결할 수 없습니다. http://localhost:4000 서버를 실행해주세요."),
    h(
      "div",
      { className: "main-grid" },
      h(
        "section",
        { className: "recommend-list" },
        h("h2", null, "추천 상권 TOP 10"),
        status === "loading" && h("p", { className: "muted" }, "추천 결과를 불러오는 중입니다."),
        status === "ready" &&
          recommendations.map((item) =>
            h(RecommendationCard, {
              key: item.areaCode,
              item,
              selected: item.areaCode === selectedAreaCode,
              checked: compareCodes.includes(item.areaCode),
              onSelect: setSelectedAreaCode,
              onToggleCompare: toggleCompare,
            })
          )
      ),
      h("aside", null, h(DetailPanel, { detail, loading: detailLoading, useAi }), h(ComparePanel, { compare, selectedCodes: compareCodes }))
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
