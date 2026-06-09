import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import {
  compareAreas,
  createComparison,
  DEFAULT_CATEGORY_CODE,
  deleteComparisonItem,
  getAiCompareSummary,
  getComparisons,
  type AreaDetail,
  type BusinessCategory,
  type CompareAiSummaryResponse,
  type CompareResponse,
  type Comparison,
  type TimeValue,
} from "../lib/api";
import { formatNumber, formatPercent, formatWon } from "../lib/format";

const DEFAULT_TIME: TimeValue = "evening";
const DEFAULT_AGES = ["20", "30"];

function getItemCategory(item: { businessCategory?: BusinessCategory | null; category?: BusinessCategory | null }) {
  return item.businessCategory || item.category || null;
}

function getUniqueCategoryCodes(comparison: Comparison) {
  return Array.from(
    new Set(
      comparison.items
        .map((item) => getItemCategory(item)?.code)
        .filter((code): code is string => Boolean(code))
    )
  );
}

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [analysis, setAnalysis] = useState<CompareResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryNotice, setCategoryNotice] = useState("");
  const [aiSummary, setAiSummary] = useState<CompareAiSummaryResponse | null>(null);
  const [aiSummaryStatus, setAiSummaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [aiSummaryError, setAiSummaryError] = useState("");

  const query = useMemo(() => {
    const targetAges = (searchParams.get("targetAges") || DEFAULT_AGES.join(","))
      .split(",")
      .map((age) => age.trim())
      .filter(Boolean);

    return {
      category: searchParams.get("category") || null,
      time: (searchParams.get("time") || DEFAULT_TIME) as TimeValue,
      targetAges: targetAges.length > 0 ? targetAges : DEFAULT_AGES,
      minQualityScore: Number(searchParams.get("minQualityScore") || 60),
    };
  }, [searchParams]);

  const comparisonCategory = useMemo(
    () => (comparison ? comparison.items.map(getItemCategory).find(Boolean) || null : null),
    [comparison]
  );

  async function loadComparison() {
    if (!isAuthenticated) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setCategoryNotice("");
    setAiSummary(null);
    setAiSummaryStatus("idle");
    setAiSummaryError("");

    try {
      const result = await getComparisons();
      let selected = result.items[0] || null;

      if (!selected) {
        const created = await createComparison({ name: "내 비교함" });
        selected = created.item;
      }

      setComparison(selected);

      if (selected.items.length >= 2) {
        const [first, second] = selected.items;
        const itemCategoryCodes = getUniqueCategoryCodes(selected);

        if (itemCategoryCodes.length > 1) {
          setAnalysis(null);
          setCategoryNotice("서로 다른 업종이 비교함에 함께 담겨 있습니다. 같은 업종끼리만 비교할 수 있도록 항목을 정리해주세요.");
          setStatus("ready");
          return;
        }

        const category = itemCategoryCodes[0] || query.category || DEFAULT_CATEGORY_CODE;
        const compareResult = await compareAreas({
          category,
          areaA: first.areaCode,
          areaB: second.areaCode,
          time: query.time,
          targetAges: query.targetAges,
          minQualityScore: query.minQualityScore,
        });
        setAnalysis(compareResult);
      } else {
        setAnalysis(null);
      }

      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "비교함 정보를 불러오지 못했습니다.");
    }
  }

  async function removeItem(itemId: string) {
    if (!comparison) {
      return;
    }

    try {
      await deleteComparisonItem(comparison.id, itemId);
      await loadComparison();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "비교 항목 삭제에 실패했습니다.");
    }
  }

  async function loadAiCompareSummary() {
    if (!analysis || !comparison) {
      return;
    }

    setAiSummaryStatus("loading");
    setAiSummaryError("");

    try {
      const result = await getAiCompareSummary({
        comparisonId: comparison.id,
        items: analysis.areas.map((area) => ({
          areaFeatureId: area.areaFeatureId,
          districtName: area.areaName,
          category: area.category,
          score: area.score,
          metrics: area.metrics,
          dataQuality: area.dataQuality,
          scoreBreakdown: area.scoreBreakdown,
          cautions: area.cautions,
        })),
      });
      setAiSummary(result);
      setAiSummaryStatus("idle");
    } catch (error) {
      setAiSummaryStatus("error");
      setAiSummaryError(error instanceof Error ? error.message : "AI 비교 요약을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    loadComparison();
  }, [isAuthenticated, isLoading, query.category, query.time, query.targetAges.join(","), query.minQualityScore]);

  if (!isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <div className="flex-grow bg-[#F7F6F1] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B726D] hover:text-[#17211D] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          이전 화면으로 돌아가기
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#173F35] mb-2">내 비교함</h1>
            <p className="text-[#6B726D]">
              추천 카드에서 추가한 상권을 모아두고, 상위 2개 상권을 바로 비교합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={loadComparison}
            className="inline-flex items-center justify-center gap-2 bg-white border border-[#D9DED7] text-[#173F35] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#F7F6F1]"
          >
            <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>

        {status === "loading" && <LoadingCompare />}
        {status === "error" && <ErrorPanel message={errorMessage} onRetry={loadComparison} />}

        {status === "ready" && comparison && (
          <>
            <section className="bg-white rounded-2xl border border-[#D9DED7] shadow-sm p-5 mb-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#173F35]">{comparison.name}</h2>
                  <p className="text-sm text-[#6B726D]">
                    {comparison.items.length}개 상권이 담겨 있습니다.
                  </p>
                </div>
                <Link
                  to={`/recommendations?category=${encodeURIComponent(
                    comparisonCategory?.code || query.category || DEFAULT_CATEGORY_CODE
                  )}`}
                  className="bg-[#173F35] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#0f2c25]"
                >
                  추천에서 추가
                </Link>
              </div>

              {comparison.items.length === 0 ? (
                <div className="border border-dashed border-[#D9DED7] rounded-xl p-8 text-center">
                  <p className="text-[#6B726D] mb-4">비교함에 담긴 상권이 없습니다.</p>
                  <Link
                    to={`/recommendations?category=${encodeURIComponent(
                      comparisonCategory?.code || query.category || DEFAULT_CATEGORY_CODE
                    )}`}
                    className="inline-flex bg-[#C99728] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#b08423]"
                  >
                    추천 상권 보러가기
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {comparison.items.map((item, index) => {
                    const category = getItemCategory(item);

                    return (
                      <div
                        key={item.id}
                        className="border border-[#D9DED7] rounded-xl p-4 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#C99728]">
                              비교 후보 {index + 1}
                            </span>
                            {category && (
                              <span className="text-xs font-bold text-[#173F35] bg-[#E8F3EF] px-2 py-0.5 rounded-full">
                                {category.label}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-[#17211D]">{item.areaName}</div>
                          <div className="text-xs text-[#6B726D] mt-1">행정동 코드 {item.areaCode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#D9DED7] text-[#6B726D] hover:bg-red-50 hover:text-red-700"
                          aria-label={`${item.areaName} 비교함에서 삭제`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {categoryNotice && (
              <div className="bg-[#FFF3D8] rounded-2xl p-6 border border-[#E8D4A2] mb-8">
                <div className="font-bold text-[#173F35] mb-2">업종을 맞춰서 비교해주세요.</div>
                <p className="text-sm text-[#17211D]">{categoryNotice}</p>
              </div>
            )}

            {comparison.items.length === 1 && (
              <div className="bg-[#FFF3D8] rounded-2xl p-6 border border-[#E8D4A2] mb-8">
                <div className="font-bold text-[#173F35] mb-2">비교하려면 상권이 하나 더 필요합니다.</div>
                <p className="text-sm text-[#17211D]">
                  추천 목록에서 다른 상권의 비교 추가 버튼을 눌러주세요.
                </p>
              </div>
            )}

            {analysis && (
              <>
                <CompareTable areas={analysis.areas} />

                <section className="bg-[#FFF3D8] rounded-2xl p-8 border border-[#E8D4A2] shadow-sm">
                  <h2 className="text-xl font-bold text-[#173F35] mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-[#C99728]" />
                    비교 요약
                  </h2>
                  <p className="text-sm text-[#17211D] leading-7 mb-5">{analysis.summary}</p>
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={loadAiCompareSummary}
                      disabled={aiSummaryStatus === "loading"}
                      className="inline-flex items-center justify-center gap-2 bg-[#173F35] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#0f2c25] disabled:opacity-60"
                    >
                      <Sparkles className={`w-4 h-4 ${aiSummaryStatus === "loading" ? "animate-spin" : ""}`} />
                      AI 비교 요약
                    </button>
                  </div>
                  {aiSummaryStatus === "error" && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-5">
                      {aiSummaryError}
                    </div>
                  )}
                  {aiSummary && <CompareAiSummaryCard response={aiSummary} />}
                  <div className="grid md:grid-cols-2 gap-4">
                    {analysis.areas.map((area, index) => (
                      <div key={area.areaCode} className="bg-white/60 p-4 rounded-xl">
                        <h3 className="font-bold text-[#17211D] mb-2 flex items-center gap-2">
                          {index === 0 ? (
                            <Trophy className="w-4 h-4 text-[#C99728]" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#2F7565]" />
                          )}
                          {area.areaName}
                        </h3>
                        <p className="text-sm text-[#17211D]">
                          신뢰도 {area.dataQuality.score}점, 타깃 매출비율{" "}
                          {formatPercent(area.metrics.targetSalesRatio)}, 선택 시간대 매출비중{" "}
                          {formatPercent(area.metrics.selectedTimeSalesRatio)}입니다.
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompareAiSummaryCard({ response }: { response: CompareAiSummaryResponse }) {
  const summary = response.summary;
  const isFallback = response.mode !== "openai";

  return (
    <div className="bg-white/70 border border-[#E8D4A2] rounded-2xl p-5 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-bold text-[#173F35]">AI 비교 요약</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
              isFallback ? "bg-[#FFF3D8] text-[#8A6418]" : "bg-[#E8F3EF] text-[#173F35]"
            }`}
          >
            {isFallback ? "rule-based fallback" : "OpenAI"}
          </span>
          {response.error && <span className="text-xs text-[#8A6418]">{response.error}</span>}
        </div>
      </div>
      <p className="text-sm leading-7 text-[#17211D] mb-4">{summary.overall}</p>
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <AiComparePoint title="안정적 선택" text={summary.bestForStableChoice} />
        <AiComparePoint title="타깃 수요" text={summary.bestForTargetDemand} />
        <AiComparePoint title="프리미엄 전략" text={summary.bestForPremiumStrategy} />
      </div>
      <div className="space-y-2 mb-4">
        {summary.risks.map((risk) => (
          <div key={risk} className="flex gap-2 text-sm text-[#17211D]">
            <AlertCircle className="w-4 h-4 text-[#C99728] shrink-0 mt-0.5" />
            <span>{risk}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[#F7F6F1] border border-[#D9DED7] p-4 text-sm font-medium text-[#17211D] leading-7">
        {summary.finalRecommendation}
      </div>
    </div>
  );
}

function AiComparePoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#D9DED7] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[#173F35] mb-2">
        <CheckCircle2 className="w-4 h-4 text-[#2F7565]" />
        {title}
      </div>
      <p className="text-sm text-[#17211D] leading-6">{text}</p>
    </div>
  );
}

function CompareTable({ areas }: { areas: AreaDetail[] }) {
  const categoryLabel = areas[0]?.category?.label || "업종";
  const rows = [
    { label: "추천 점수", render: (area: AreaDetail) => `${area.score.toFixed(1)}점`, strong: true },
    { label: "데이터 신뢰도", render: (area: AreaDetail) => `${area.dataQuality.score}점 (${area.dataQuality.grade})` },
    { label: "타깃 매출비율", render: (area: AreaDetail) => formatPercent(area.metrics.targetSalesRatio) },
    { label: "타깃 유동인구", render: (area: AreaDetail) => formatNumber(area.metrics.targetPopulation) },
    { label: "타깃 유동인구비율", render: (area: AreaDetail) => formatPercent(area.metrics.targetPopulationRatio) },
    {
      label: `${categoryLabel} 전환효율`,
      render: (area: AreaDetail) =>
        formatPercent(
          area.metrics.categoryConversionRate ?? area.metrics.conversionRate ?? area.metrics.cafeConversionRate,
          2
        ),
    },
    { label: "선택시간 매출비중", render: (area: AreaDetail) => formatPercent(area.metrics.selectedTimeSalesRatio) },
    { label: "객단가", render: (area: AreaDetail) => formatWon(area.metrics.averageOrderValue ?? area.metrics.averagePrice) },
    { label: "매출 안정성", render: (area: AreaDetail) => formatPercent(area.metrics.salesStability) },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-[#F7F6F1] border-b border-[#D9DED7]">
              <th className="px-6 py-4 text-left font-bold text-[#6B726D] w-1/4">비교 항목</th>
              {areas.map((area) => (
                <th key={area.areaCode} className="px-6 py-4 border-l border-[#D9DED7]">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-[#17211D]">{area.areaName}</span>
                    {area.category && (
                      <span className="text-xs font-bold text-[#173F35] bg-[#E8F3EF] px-2 py-0.5 rounded-full mt-1">
                        {area.category.label}
                      </span>
                    )}
                    <span className="text-xs text-[#6B726D]">행정동 {area.areaCode}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9DED7]">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-left font-medium text-[#6B726D] bg-[#F7F6F1]/50">{row.label}</td>
                {areas.map((area) => (
                  <td key={`${area.areaCode}-${row.label}`} className="px-6 py-4 border-l border-[#D9DED7]">
                    <span className={row.strong ? "text-2xl font-black text-[#C99728]" : "font-bold text-[#17211D]"}>
                      {row.render(area)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingCompare() {
  return (
    <div className="bg-white rounded-2xl border border-[#D9DED7] p-8 animate-pulse">
      <div className="h-8 bg-[#EAE8E1] rounded w-1/3 mb-6" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-12 bg-[#F7F6F1] rounded" />
        ))}
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">비교함을 불러오지 못했습니다.</div>
          <p className="text-sm mt-1">{message}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 bg-white border border-red-200 px-4 py-2 rounded-lg text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
