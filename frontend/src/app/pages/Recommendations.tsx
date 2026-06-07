import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  BarChart3,
  BookmarkPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  addComparisonItem,
  buildQuery,
  createComparison,
  getComparisons,
  getRecommendations,
  getSavedAreas,
  saveArea,
  type RecommendationItem,
  type RecommendationResponse,
  type TimeValue,
} from "../lib/api";
import { AGE_OPTIONS, TIME_OPTIONS, getTimeLabel } from "../lib/options";
import { formatNumber, formatPercent, formatWon } from "../lib/format";
import { readCompareCodes, writeCompareCodes } from "../lib/storage";
import { useAuth } from "../auth/AuthContext";

const DEFAULT_TIME: TimeValue = "evening";
const DEFAULT_AGES = ["20", "30"];

export default function Recommendations() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedTime, setSelectedTime] = useState<TimeValue>(DEFAULT_TIME);
  const [selectedAges, setSelectedAges] = useState<string[]>(DEFAULT_AGES);
  const [useAdjustedScore, setUseAdjustedScore] = useState(true);
  const [stableOnly, setStableOnly] = useState(true);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [selectedAreaCode, setSelectedAreaCode] = useState<string | null>(null);
  const [compareCodes, setCompareCodes] = useState<string[]>(() => readCompareCodes());
  const [savedAreaFeatureIds, setSavedAreaFeatureIds] = useState<string[]>([]);
  const [comparisonAreaFeatureIds, setComparisonAreaFeatureIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionStatus, setActionStatus] = useState<"idle" | "success" | "error">("idle");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const minQualityScore = stableOnly ? 60 : 0;

  const filterQuery = useMemo(
    () =>
      buildQuery({
        time: selectedTime,
        targetAges: selectedAges,
        useAdjustedScore,
        minQualityScore,
      }),
    [selectedTime, selectedAges, useAdjustedScore, minQualityScore]
  );

  const selectedArea = useMemo(() => {
    if (!data?.items.length) {
      return null;
    }
    return data.items.find((item) => item.areaCode === selectedAreaCode) || data.items[0];
  }, [data, selectedAreaCode]);

  function toggleAge(age: string) {
    setSelectedAges((current) => {
      if (current.includes(age)) {
        const next = current.filter((item) => item !== age);
        return next.length > 0 ? next : DEFAULT_AGES;
      }
      return [...current, age].sort((a, b) => Number(a) - Number(b));
    });
  }

  function toggleCompare(areaCode: string) {
    setCompareCodes((current) => {
      const next = current.includes(areaCode)
        ? current.filter((code) => code !== areaCode)
        : [...current, areaCode].slice(-2);

      writeCompareCodes(next);
      return next;
    });
  }

  function requireLogin() {
    setActionStatus("error");
    setActionMessage("로그인이 필요한 기능입니다.");
    navigate("/login");
  }

  async function syncUserCollections() {
    if (!isAuthenticated) {
      setSavedAreaFeatureIds([]);
      setComparisonAreaFeatureIds([]);
      return;
    }

    try {
      const [savedResult, comparisonResult] = await Promise.all([
        getSavedAreas(),
        getComparisons(),
      ]);
      setSavedAreaFeatureIds(
        savedResult.items.map((item) => item.areaFeatureId).filter(Boolean)
      );
      setComparisonAreaFeatureIds(
        comparisonResult.items
          .flatMap((comparison) => comparison.items)
          .map((item) => item.areaFeatureId)
          .filter(Boolean)
      );
    } catch {
      setActionStatus("error");
      setActionMessage("저장함 정보를 불러오지 못했습니다.");
    }
  }

  async function getOrCreateComparisonId() {
    const comparisonResult = await getComparisons();
    const existing = comparisonResult.items[0];
    if (existing) {
      return existing.id;
    }

    const created = await createComparison({ name: "내 비교함" });
    return created.item.id;
  }

  async function handleSaveArea(item: RecommendationItem) {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      const result = await saveArea({
        areaFeatureId: item.areaFeatureId,
        areaCode: item.areaCode,
      });
      setSavedAreaFeatureIds((current) =>
        current.includes(result.item.areaFeatureId)
          ? current
          : [...current, result.item.areaFeatureId]
      );
      setActionStatus("success");
      setActionMessage(`${item.areaName}을 저장했습니다.`);
    } catch (error) {
      setActionStatus("error");
      setActionMessage(error instanceof Error ? error.message : "상권 저장에 실패했습니다.");
    }
  }

  async function handleAddComparison(item: RecommendationItem) {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      const comparisonId = await getOrCreateComparisonId();
      const result = await addComparisonItem(comparisonId, {
        areaFeatureId: item.areaFeatureId,
        areaCode: item.areaCode,
      });
      setComparisonAreaFeatureIds(
        result.item.items.map((comparisonItem) => comparisonItem.areaFeatureId)
      );
      writeCompareCodes(result.item.items.slice(0, 2).map((comparisonItem) => comparisonItem.areaCode));
      setCompareCodes(result.item.items.slice(0, 2).map((comparisonItem) => comparisonItem.areaCode));
      setActionStatus("success");
      setActionMessage(`${item.areaName}을 비교함에 추가했습니다.`);
    } catch (error) {
      setActionStatus("error");
      setActionMessage(error instanceof Error ? error.message : "비교함 추가에 실패했습니다.");
    }
  }

  async function loadRecommendations() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await getRecommendations({
        time: selectedTime,
        targetAges: selectedAges,
        useAdjustedScore,
        minQualityScore,
        limit: 10,
      });

      setData(result);
      setSelectedAreaCode((current) =>
        current && result.items.some((item) => item.areaCode === current)
          ? current
          : result.items[0]?.areaCode ?? null
      );
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "추천 결과를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadRecommendations();
  }, [selectedTime, selectedAges.join(","), useAdjustedScore, minQualityScore]);

  useEffect(() => {
    syncUserCollections();
  }, [isAuthenticated]);

  return (
    <div className="flex-grow bg-[#F7F6F1] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173F35] mb-2">카페 상권 추천</h1>
          <p className="text-[#6B726D]">운영 시간대와 타깃 연령대를 선택하면 백엔드 추천 API에서 실시간으로 순위를 불러옵니다.</p>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] p-6 mb-8">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6">
            <div className="space-y-5">
              <div>
                <div className="text-sm font-bold text-[#17211D] mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[#2F7565]" /> 운영 시간대
                </div>
                <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap gap-2 hide-scrollbar">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time.value}
                      onClick={() => setSelectedTime(time.value)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selectedTime === time.value
                          ? "bg-[#173F35] text-white"
                          : "bg-[#F7F6F1] text-[#6B726D] hover:bg-[#EAE8E1]"
                      }`}
                    >
                      {time.label} {time.range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-[#17211D] mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4 text-[#2F7565]" /> 타깃 연령대
                </div>
                <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap gap-2 hide-scrollbar">
                  {AGE_OPTIONS.map((age) => (
                    <button
                      key={age.value}
                      onClick={() => toggleAge(age.value)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selectedAges.includes(age.value)
                          ? "bg-[#C99728] text-white"
                          : "bg-[#F7F6F1] text-[#6B726D] hover:bg-[#EAE8E1]"
                      }`}
                    >
                      {age.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAdjustedScore}
                    onChange={(event) => setUseAdjustedScore(event.target.checked)}
                    className="rounded text-[#C99728] focus:ring-[#C99728] w-4 h-4 border-[#D9DED7]"
                  />
                  <span className="text-sm text-[#17211D]">이상치 보정 점수 사용</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stableOnly}
                    onChange={(event) => setStableOnly(event.target.checked)}
                    className="rounded text-[#C99728] focus:ring-[#C99728] w-4 h-4 border-[#D9DED7]"
                  />
                  <span className="text-sm text-[#17211D]">안정 추천 우선</span>
                </label>
              </div>
            </div>

            <div className="lg:border-l lg:border-[#D9DED7] lg:pl-6 flex flex-col justify-end gap-3">
              <button
                onClick={loadRecommendations}
                className="w-full lg:w-auto bg-[#C99728] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#b08423] transition-colors shadow-sm whitespace-nowrap inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
                다시 불러오기
              </button>
              <Link
                to={compareCodes.length >= 2 ? `/compare?areaA=${compareCodes[0]}&areaB=${compareCodes[1]}&${filterQuery}` : "/compare"}
                className={`text-center px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  compareCodes.length >= 2
                    ? "bg-white text-[#173F35] border-[#173F35] hover:bg-[#F7F6F1]"
                    : "bg-[#F7F6F1] text-[#6B726D] border-[#D9DED7]"
                }`}
              >
                비교 보기 {compareCodes.length}/2
              </Link>
            </div>
          </div>
        </section>

        {actionMessage && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              actionStatus === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {actionMessage}
          </div>
        )}

        {status === "error" && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">추천 결과를 불러오지 못했습니다.</div>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {status === "loading" && <LoadingList />}
            {status !== "loading" && data?.items.length === 0 && <EmptyState />}
            {status !== "loading" &&
              data?.items.map((item) => (
                <RecommendationCard
                  key={item.areaCode}
                  item={item}
                  selected={selectedArea?.areaCode === item.areaCode}
                  saved={Boolean(item.areaFeatureId && savedAreaFeatureIds.includes(item.areaFeatureId))}
                  checked={
                    compareCodes.includes(item.areaCode) ||
                    Boolean(item.areaFeatureId && comparisonAreaFeatureIds.includes(item.areaFeatureId))
                  }
                  detailQuery={filterQuery}
                  onSelect={() => setSelectedAreaCode(item.areaCode)}
                  onSave={() => handleSaveArea(item)}
                  onToggleCompare={() => handleAddComparison(item)}
                />
              ))}
          </div>

          <div className="lg:col-span-5">
            <DetailSidePanel item={selectedArea} detailQuery={filterQuery} selectedTime={selectedTime} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  item,
  selected,
  saved,
  checked,
  detailQuery,
  onSelect,
  onSave,
  onToggleCompare,
}: {
  item: RecommendationItem;
  selected: boolean;
  saved: boolean;
  checked: boolean;
  detailQuery: string;
  onSelect: () => void;
  onSave: () => void;
  onToggleCompare: () => void;
}) {
  return (
    <article
      onClick={onSelect}
      className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${
        selected ? "border-[#173F35] shadow-md" : "border-[#D9DED7] hover:border-[#2F7565] hover:shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              item.rank === 1 ? "bg-[#C99728] text-white" : "bg-[#F7F6F1] text-[#173F35]"
            }`}
          >
            {item.rank}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#17211D] flex items-center gap-2">
              {item.areaName}
              <span className="text-xs font-normal text-[#6B726D] bg-[#F7F6F1] px-2 py-0.5 rounded">행정동 {item.areaCode}</span>
            </h3>
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {item.recommendationTier || "추천"} · 신뢰도 {item.dataQuality.score}점
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-[#173F35]">{item.score.toFixed(1)}</div>
          {item.baseScore !== undefined && <div className="text-xs text-[#6B726D]">기본 {item.baseScore.toFixed(1)}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <Metric label="타깃 매출비율" value={formatPercent(item.metrics.targetSalesRatio)} />
        <Metric label="카페전환효율" value={formatPercent(item.metrics.cafeConversionRate ?? item.metrics.conversionRate, 2)} />
        <Metric label="선택시간 매출" value={formatPercent(item.metrics.selectedTimeSalesRatio)} />
        <Metric label="타깃 유동인구" value={formatNumber(item.metrics.targetPopulation)} hiddenOnMobile />
        <Metric label="객단가" value={formatWon(item.metrics.averageOrderValue ?? item.metrics.averagePrice)} hiddenOnMobile />
      </div>

      <div className="text-sm text-[#6B726D] bg-gray-50 p-3 rounded-lg flex gap-2 mb-4">
        <Info className="w-4 h-4 text-[#C99728] shrink-0 mt-0.5" />
        <p>{item.reasons?.[0] || item.strategyGuide || "선택 조건 기준으로 추천 점수를 계산했습니다."}</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSave();
          }}
          className={`text-sm px-4 py-2 border rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
            saved
              ? "border-[#2F7565] bg-[#E8F3EF] text-[#173F35]"
              : "border-[#D9DED7] text-[#17211D] hover:bg-gray-50"
          }`}
        >
          <BookmarkPlus className="w-4 h-4" /> {saved ? "저장됨" : "저장"}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCompare();
          }}
          className={`text-sm px-4 py-2 border rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
            checked
              ? "border-[#C99728] bg-[#FFF3D8] text-[#173F35]"
              : "border-[#D9DED7] text-[#17211D] hover:bg-gray-50"
          }`}
        >
          <Plus className="w-4 h-4" /> {checked ? "비교함 추가됨" : "비교 추가"}
        </button>
        <Link
          to={`/detail/${item.areaCode}?${detailQuery}`}
          onClick={(event) => event.stopPropagation()}
          className="text-sm px-4 py-2 bg-[#173F35] text-white rounded-lg font-medium hover:bg-[#0f2c25] flex items-center gap-1.5 transition-colors"
        >
          상세 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

function DetailSidePanel({
  item,
  detailQuery,
  selectedTime,
}: {
  item: RecommendationItem | null;
  detailQuery: string;
  selectedTime: TimeValue;
}) {
  if (!item) {
    return (
      <aside className="bg-white rounded-2xl shadow-lg border border-[#D9DED7] p-6">
        <p className="text-[#6B726D]">추천 결과를 불러오면 상권 요약이 표시됩니다.</p>
      </aside>
    );
  }

  const breakdown = item.scoreBreakdown || {};

  return (
    <aside className="bg-white rounded-2xl shadow-lg border border-[#D9DED7] sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      <div className="p-6 border-b border-[#D9DED7] bg-gradient-to-br from-white to-[#F7F6F1]">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold text-[#173F35]">{item.areaName}</h2>
          <div className="text-right">
            <div className="text-3xl font-black text-[#C99728]">
              {item.score.toFixed(1)}
              <span className="text-sm font-medium text-[#6B726D]">점</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#2F7565] font-semibold bg-[#F0FDF4] px-3 py-1.5 rounded-md inline-flex border border-green-100">
          <ShieldCheck className="w-4 h-4" /> 데이터 신뢰도 {item.dataQuality.score}점 ({item.dataQuality.grade})
        </div>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <MetricPanel label="타깃 매출비율" value={formatPercent(item.metrics.targetSalesRatio)} />
          <MetricPanel label="타깃 유동인구" value={formatNumber(item.metrics.targetPopulation)} />
          <MetricPanel label="카페전환효율" value={formatPercent(item.metrics.cafeConversionRate ?? item.metrics.conversionRate, 2)} />
          <MetricPanel label="선택시간 매출" value={formatPercent(item.metrics.selectedTimeSalesRatio)} />
        </div>

        <h3 className="font-bold text-[#173F35] mb-4">점수 구성</h3>
        <div className="space-y-3 mb-8">
          <ScoreBar label="전환효율" value={breakdown.cafeConversionRate} />
          <ScoreBar label="타깃 매출" value={breakdown.mzSalesRatio} />
          <ScoreBar label="타깃 유동" value={breakdown.targetPopulationVolume} />
          <ScoreBar label="선택 시간" value={breakdown.selectedTimeSalesRatio} />
          <ScoreBar label="객단가" value={breakdown.averageOrderValue} />
        </div>

        <h3 className="font-bold text-[#173F35] mb-4">운영 전략 가이드</h3>
        <p className="text-sm text-[#17211D] bg-[#FFF3D8] border border-[#E8D4A2] p-4 rounded-xl mb-6">
          {item.strategyGuide || `${getTimeLabel(selectedTime)} 기준 상권 데이터를 확인하세요.`}
        </p>

        {item.reasons && item.reasons.length > 0 && (
          <div className="space-y-2 mb-6">
            {item.reasons.slice(0, 4).map((reason) => (
              <div key={reason} className="flex gap-2 text-sm text-[#17211D]">
                <CheckCircle2 className="w-4 h-4 text-[#2F7565] shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}

        <Link
          to={`/detail/${item.areaCode}?${detailQuery}`}
          className="block text-center bg-[#173F35] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#0f2c25] transition-colors"
        >
          상세 분석 보기
        </Link>
      </div>
    </aside>
  );
}

function Metric({ label, value, hiddenOnMobile = false }: { label: string; value: string; hiddenOnMobile?: boolean }) {
  return (
    <div className={`bg-[#F7F6F1] p-2 rounded-lg text-center ${hiddenOnMobile ? "hidden sm:block" : ""}`}>
      <div className="text-[10px] text-[#6B726D] mb-1">{label}</div>
      <div className="text-sm font-bold text-[#17211D]">{value}</div>
    </div>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#D9DED7] p-4 rounded-xl shadow-sm">
      <div className="text-xs text-[#6B726D] mb-1 font-medium">{label}</div>
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

function LoadingList() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="bg-white rounded-2xl p-5 border border-[#D9DED7] animate-pulse">
          <div className="h-6 bg-[#EAE8E1] rounded w-1/3 mb-4" />
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[0, 1, 2, 3, 4].map((cell) => (
              <div key={cell} className="h-12 bg-[#F7F6F1] rounded" />
            ))}
          </div>
          <div className="h-16 bg-[#F7F6F1] rounded" />
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#D9DED7] p-8 text-center">
      <AlertCircle className="w-8 h-8 text-[#C99728] mx-auto mb-3" />
      <div className="font-bold text-[#17211D]">조건에 맞는 추천 결과가 없습니다.</div>
      <p className="text-sm text-[#6B726D] mt-2">타깃 연령대나 안정 추천 옵션을 조정해 보세요.</p>
    </div>
  );
}
