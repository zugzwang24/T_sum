import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import {
  buildQuery,
  compareAreas,
  getRecommendations,
  type AreaDetail,
  type CompareResponse,
  type TimeValue,
} from "../lib/api";
import { formatNumber, formatPercent, formatWon } from "../lib/format";
import { readCompareCodes, writeCompareCodes } from "../lib/storage";

const DEFAULT_TIME: TimeValue = "evening";
const DEFAULT_AGES = ["20", "30"];

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CompareResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const query = useMemo(() => {
    const targetAges = (searchParams.get("targetAges") || DEFAULT_AGES.join(","))
      .split(",")
      .map((age) => age.trim())
      .filter(Boolean);

    return {
      areaA: searchParams.get("areaA") || undefined,
      areaB: searchParams.get("areaB") || undefined,
      time: (searchParams.get("time") || DEFAULT_TIME) as TimeValue,
      targetAges: targetAges.length > 0 ? targetAges : DEFAULT_AGES,
      minQualityScore: Number(searchParams.get("minQualityScore") || 60),
      useAdjustedScore: searchParams.get("useAdjustedScore") !== "false",
    };
  }, [searchParams]);

  async function ensureCompareTargets() {
    if (query.areaA && query.areaB) {
      return { areaA: query.areaA, areaB: query.areaB };
    }

    const stored = readCompareCodes();
    if (stored.length >= 2) {
      return { areaA: stored[0], areaB: stored[1] };
    }

    const recommendations = await getRecommendations({
      time: query.time,
      targetAges: query.targetAges,
      useAdjustedScore: query.useAdjustedScore,
      minQualityScore: query.minQualityScore,
      limit: 2,
    });

    const [first, second] = recommendations.items;
    if (!first || !second) {
      throw new Error("비교할 상권이 부족합니다.");
    }

    return { areaA: first.areaCode, areaB: second.areaCode };
  }

  async function loadCompare() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const targets = await ensureCompareTargets();
      writeCompareCodes([targets.areaA, targets.areaB]);

      const nextSearch = buildQuery({
        areaA: targets.areaA,
        areaB: targets.areaB,
        time: query.time,
        targetAges: query.targetAges,
        minQualityScore: query.minQualityScore,
        useAdjustedScore: query.useAdjustedScore,
      });
      if (searchParams.toString() !== nextSearch) {
        setSearchParams(new URLSearchParams(nextSearch), { replace: true });
      }

      const result = await compareAreas({
        ...targets,
        time: query.time,
        targetAges: query.targetAges,
        minQualityScore: query.minQualityScore,
      });

      setData(result);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "상권 비교 정보를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadCompare();
  }, [query.areaA, query.areaB, query.time, query.targetAges.join(","), query.minQualityScore, query.useAdjustedScore]);

  function removeArea(areaCode: string) {
    const next = (data?.areas || []).filter((area) => area.areaCode !== areaCode).map((area) => area.areaCode);
    writeCompareCodes(next);
    const nextSearch = buildQuery({
        areaA: next[0],
        areaB: next[1],
        time: query.time,
        targetAges: query.targetAges,
        minQualityScore: query.minQualityScore,
        useAdjustedScore: query.useAdjustedScore,
      });
    setSearchParams(new URLSearchParams(nextSearch));
  }

  return (
    <div className="flex-grow bg-[#F7F6F1] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B726D] hover:text-[#17211D] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> 추천 목록으로 돌아가기
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#173F35] mb-2">상권 비교</h1>
          <p className="text-[#6B726D]">선택한 상권의 추천 점수와 핵심 지표를 백엔드 비교 API로 확인합니다.</p>
        </div>

        {status === "loading" && <LoadingCompare />}
        {status === "error" && <ErrorPanel message={errorMessage} onRetry={loadCompare} />}
        {status === "ready" && data && (
          <>
            <div className="flex flex-wrap gap-3 mb-8">
              {data.areas.map((area) => (
                <div key={area.areaCode} className="bg-white border border-[#D9DED7] pl-4 pr-2 py-2 rounded-full flex items-center gap-2 shadow-sm">
                  <span className="font-bold text-[#17211D]">{area.areaName}</span>
                  <button
                    onClick={() => removeArea(area.areaCode)}
                    className="p-1 hover:bg-gray-100 rounded-full text-[#6B726D]"
                    aria-label={`${area.areaName} 비교 제거`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Link
                to={`/recommendations?${buildQuery({
                  time: query.time,
                  targetAges: query.targetAges,
                  minQualityScore: query.minQualityScore,
                  useAdjustedScore: query.useAdjustedScore,
                })}`}
                className="bg-[#F7F6F1] border border-dashed border-[#D9DED7] px-4 py-2 rounded-full text-[#6B726D] text-sm font-medium hover:bg-[#EAE8E1] transition-colors"
              >
                + 추천 목록에서 다시 선택
              </Link>
            </div>

            <CompareTable areas={data.areas} />

            <section className="bg-[#FFF3D8] rounded-2xl p-8 border border-[#E8D4A2] shadow-sm">
              <h2 className="text-xl font-bold text-[#173F35] mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#C99728]" /> 비교 요약
              </h2>
              <p className="text-sm text-[#17211D] leading-7 mb-5">{data.summary}</p>
              <div className="grid md:grid-cols-2 gap-4">
                {data.areas.map((area, index) => (
                  <div key={area.areaCode} className="bg-white/60 p-4 rounded-xl">
                    <h3 className="font-bold text-[#17211D] mb-2 flex items-center gap-2">
                      {index === 0 ? <Trophy className="w-4 h-4 text-[#C99728]" /> : <CheckCircle2 className="w-4 h-4 text-[#2F7565]" />}
                      {area.areaName}
                    </h3>
                    <p className="text-sm text-[#17211D]">
                      신뢰도 {area.dataQuality.score}점, 타깃 매출비율 {formatPercent(area.metrics.targetSalesRatio)}, 선택 시간대 매출비중 {formatPercent(area.metrics.selectedTimeSalesRatio)}입니다.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function CompareTable({ areas }: { areas: AreaDetail[] }) {
  const rows = [
    { label: "추천 점수", render: (area: AreaDetail) => `${area.score.toFixed(1)}점`, strong: true },
    { label: "데이터 신뢰도", render: (area: AreaDetail) => `${area.dataQuality.score}점 (${area.dataQuality.grade})` },
    { label: "타깃 매출비율", render: (area: AreaDetail) => formatPercent(area.metrics.targetSalesRatio) },
    { label: "타깃 유동인구", render: (area: AreaDetail) => formatNumber(area.metrics.targetPopulation) },
    { label: "타깃 유동인구비율", render: (area: AreaDetail) => formatPercent(area.metrics.targetPopulationRatio) },
    { label: "카페전환효율", render: (area: AreaDetail) => formatPercent(area.metrics.cafeConversionRate ?? area.metrics.conversionRate, 2) },
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
          <div className="font-bold">상권 비교를 불러오지 못했습니다.</div>
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
