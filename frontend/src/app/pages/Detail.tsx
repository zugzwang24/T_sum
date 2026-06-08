import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { DEFAULT_CATEGORY_CODE, getAreaDetail, type AreaDetail, type TimeValue } from "../lib/api";
import { TIME_OPTIONS } from "../lib/options";
import { formatNumber, formatPercent, formatWon } from "../lib/format";

const DEFAULT_TIME: TimeValue = "evening";
const DEFAULT_AGES = ["20", "30"];

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [detail, setDetail] = useState<AreaDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const query = useMemo(() => {
    const time = (searchParams.get("time") || DEFAULT_TIME) as TimeValue;
    const targetAges = (searchParams.get("targetAges") || DEFAULT_AGES.join(","))
      .split(",")
      .map((age) => age.trim())
      .filter(Boolean);

    return {
      category: searchParams.get("category") || DEFAULT_CATEGORY_CODE,
      time,
      targetAges: targetAges.length > 0 ? targetAges : DEFAULT_AGES,
      useAdjustedScore: searchParams.get("useAdjustedScore") !== "false",
      minQualityScore: Number(searchParams.get("minQualityScore") || 60),
    };
  }, [searchParams]);

  async function loadDetail() {
    if (!id) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await getAreaDetail(id, {
        ...query,
        ai: true,
      });
      setDetail(result);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "상권 상세 정보를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id, query.category, query.time, query.targetAges.join(","), query.useAdjustedScore, query.minQualityScore]);

  return (
    <div className="flex-grow bg-[#F7F6F1] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B726D] hover:text-[#17211D] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> 추천 목록으로 돌아가기
        </button>

        {status === "loading" && <LoadingDetail />}
        {status === "error" && (
          <ErrorPanel message={errorMessage} onRetry={loadDetail} />
        )}
        {status === "ready" && detail && <DetailContent detail={detail} />}
      </div>
    </div>
  );
}

function DetailContent({ detail }: { detail: AreaDetail }) {
  const categoryLabel = detail.category?.label || "업종";
  const conversionLabel = `${categoryLabel} 전환효율`;

  return (
    <>
      <section className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#173F35]">{detail.areaName} 상권 분석</h1>
              {detail.rank && <span className="bg-[#173F35] text-white text-sm px-3 py-1 rounded-full font-bold">{detail.rank}위</span>}
            </div>
            <p className="text-[#6B726D] text-lg mb-4">행정동 코드 {detail.areaCode}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8F3EF] text-[#173F35] text-sm font-semibold border border-[#C8DDD5]">
                {categoryLabel}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] text-green-700 text-sm font-semibold border border-green-200">
                <ShieldCheck className="w-4 h-4" />
                {detail.recommendationTier || "추천"} · 신뢰도 {detail.dataQuality.score}점 ({detail.dataQuality.grade})
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-200">
                <BarChart3 className="w-4 h-4" />
                {detail.metrics.salesPeriodCount ?? "-"}개 기간 평균 기준
              </div>
            </div>
          </div>

          <div className="text-right bg-[#F7F6F1] px-6 py-4 rounded-xl border border-[#D9DED7]">
            <div className="text-sm text-[#6B726D] font-medium mb-1">종합 추천 점수</div>
            <div className="text-4xl font-black text-[#C99728]">
              {detail.score.toFixed(1)}
              <span className="text-xl text-[#17211D]">점</span>
            </div>
            {detail.baseScore !== undefined && <div className="text-xs text-[#6B726D] mt-1">기본점수 {detail.baseScore.toFixed(1)}</div>}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#173F35] to-[#2F7565] rounded-2xl p-8 mb-8 text-white shadow-md">
        <h2 className="text-xl font-bold text-[#FFF3D8] mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6" /> AI 해설
        </h2>
        <p className="text-sm leading-7 text-white/90">
          {detail.aiReason?.text || "AI 해설을 준비 중입니다. 데이터 기반 지표는 아래에서 먼저 확인할 수 있습니다."}
        </p>
        {detail.aiReason?.error && (
          <p className="mt-3 text-xs text-[#FFF3D8]">AI 호출 실패: {detail.aiReason.error}</p>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6">
          <h3 className="text-lg font-bold text-[#17211D] mb-6">핵심 지표</h3>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="월평균 매출건수" value={formatNumber(detail.metrics.totalSalesCount)} />
            <Metric label="총 유동인구" value={formatNumber(detail.metrics.totalPopulation)} />
            <Metric label="타깃 유동인구" value={formatNumber(detail.metrics.targetPopulation)} />
            <Metric label="타깃 매출비율" value={formatPercent(detail.metrics.targetSalesRatio)} />
            <Metric
              label={conversionLabel}
              value={formatPercent(
                detail.metrics.categoryConversionRate ?? detail.metrics.conversionRate ?? detail.metrics.cafeConversionRate,
                2
              )}
            />
            <Metric label="타깃 전환효율" value={formatPercent(detail.metrics.targetConversionRate, 2)} />
            <Metric label="객단가" value={formatWon(detail.metrics.averageOrderValue ?? detail.metrics.averagePrice)} />
            <Metric label="매출 안정성" value={formatPercent(detail.metrics.salesStability)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6">
          <h3 className="text-lg font-bold text-[#17211D] mb-6">점수 구성</h3>
          <div className="space-y-4">
            <ScoreBar label="전환효율" value={detail.scoreBreakdown?.categoryConversionRate ?? detail.scoreBreakdown?.cafeConversionRate} />
            <ScoreBar label="타깃 매출" value={detail.scoreBreakdown?.mzSalesRatio} />
            <ScoreBar label="타깃 유동" value={detail.scoreBreakdown?.targetPopulationVolume} />
            <ScoreBar label="선택 시간" value={detail.scoreBreakdown?.selectedTimeSalesRatio} />
            <ScoreBar label="객단가" value={detail.scoreBreakdown?.averageOrderValue} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6 mb-8">
        <h3 className="text-lg font-bold text-[#17211D] mb-6">시간대별 매출·유동인구 비중</h3>
        <div className="space-y-4">
          {TIME_OPTIONS.map((time) => (
            <div key={time.value}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-[#17211D]">{time.label} {time.range}</span>
                <span className="text-[#6B726D]">
                  매출 {formatPercent(detail.timeSalesRatios?.[time.value])} · 유동 {formatPercent(detail.timePopulationRatios?.[time.value])}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <RatioBar value={detail.timeSalesRatios?.[time.value]} color="#C99728" />
                <RatioBar value={detail.timePopulationRatios?.[time.value]} color="#2F7565" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6">
          <h3 className="text-lg font-bold text-[#17211D] mb-4">추천 근거</h3>
          <div className="space-y-3">
            {(detail.reasons || []).map((reason) => (
              <div key={reason} className="flex gap-2 text-sm text-[#17211D]">
                <CheckCircle2 className="w-4 h-4 text-[#2F7565] shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6">
          <h3 className="text-lg font-bold text-[#17211D] mb-4">주의사항</h3>
          {detail.cautions?.length ? (
            <div className="space-y-3">
              {detail.cautions.map((caution) => (
                <div key={caution} className="flex gap-2 text-sm text-[#17211D]">
                  <AlertCircle className="w-4 h-4 text-[#C99728] shrink-0 mt-0.5" />
                  <span>{caution}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B726D]">현재 조건에서는 특별한 데이터 주의사항이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="bg-gray-50 rounded-2xl border border-gray-200 p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-gray-700 mb-2">데이터 활용 시 주의사항</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            본 추천 결과는 서울시 공공데이터 기반 추정치입니다. 임대료, 권리금, 현장 분위기, 경쟁점 분포는 별도 확인이 필요합니다.
          </p>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F6F1] p-4 rounded-xl">
      <div className="text-sm text-[#6B726D] mb-1">{label}</div>
      <div className="text-xl font-bold text-[#17211D]">{value}</div>
    </div>
  );
}

function ScoreBar({ label, value = 0 }: { label: string; value?: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#6B726D]">{label}</span>
        <span className="font-bold text-[#17211D]">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-[#EAE8E1] rounded-full overflow-hidden">
        <div className="h-full bg-[#2F7565] rounded-full" style={{ width: `${Math.min(Math.max(value, 2), 100)}%` }} />
      </div>
    </div>
  );
}

function RatioBar({ value = 0, color }: { value?: number; color: string }) {
  return (
    <div className="h-2 bg-[#EAE8E1] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(value * 100, 2), 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-[#D9DED7] p-8 animate-pulse">
        <div className="h-10 bg-[#EAE8E1] rounded w-1/2 mb-4" />
        <div className="h-5 bg-[#F7F6F1] rounded w-1/3" />
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-72 bg-white rounded-2xl border border-[#D9DED7] animate-pulse" />
        <div className="h-72 bg-white rounded-2xl border border-[#D9DED7] animate-pulse" />
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
          <div className="font-bold">상세 정보를 불러오지 못했습니다.</div>
          <p className="text-sm mt-1">{message}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 bg-white border border-red-200 px-4 py-2 rounded-lg text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" /> 다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
