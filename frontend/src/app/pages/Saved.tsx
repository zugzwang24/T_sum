import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  BookmarkCheck,
  ChevronRight,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import {
  addComparisonItem,
  createComparison,
  deleteSavedArea,
  getComparisons,
  getSavedAreas,
  type SavedArea,
} from "../lib/api";
import { formatNumber, formatPercent, formatWon } from "../lib/format";

export default function Saved() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [items, setItems] = useState<SavedArea[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  async function loadSavedAreas() {
    if (!isAuthenticated) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const result = await getSavedAreas();
      setItems(result.items);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "저장한 상권을 불러오지 못했습니다.");
    }
  }

  async function getOrCreateComparisonId() {
    const comparisons = await getComparisons();
    if (comparisons.items[0]) {
      return comparisons.items[0].id;
    }

    const created = await createComparison({ name: "내 비교함" });
    return created.item.id;
  }

  async function addToComparison(item: SavedArea) {
    try {
      const comparisonId = await getOrCreateComparisonId();
      await addComparisonItem(comparisonId, {
        areaFeatureId: item.areaFeatureId,
        areaCode: item.areaCode,
      });
      setActionMessage(`${item.areaName}을 비교함에 추가했습니다.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "비교함 추가에 실패했습니다.");
    }
  }

  async function removeSavedArea(id: string) {
    try {
      await deleteSavedArea(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setActionMessage("저장한 상권을 삭제했습니다.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "저장 상권 삭제에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    loadSavedAreas();
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <div className="flex-grow bg-[#F7F6F1] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#173F35] mb-2">저장한 상권</h1>
            <p className="text-[#6B726D]">
              추천 결과에서 저장한 상권을 다시 확인하고 비교함에 담을 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSavedAreas}
            className="inline-flex items-center justify-center gap-2 bg-white border border-[#D9DED7] text-[#173F35] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#F7F6F1]"
          >
            <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>

        {actionMessage && (
          <div className="mb-6 rounded-xl border border-[#D9DED7] bg-white px-4 py-3 text-sm font-semibold text-[#173F35]">
            {actionMessage}
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">저장한 상권을 불러오지 못했습니다.</div>
              <p className="text-sm mt-1">{message}</p>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="grid md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-56 bg-white border border-[#D9DED7] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="bg-white border border-[#D9DED7] rounded-2xl p-10 text-center">
            <BookmarkCheck className="w-10 h-10 text-[#C99728] mx-auto mb-4" />
            <div className="text-xl font-bold text-[#173F35] mb-2">아직 저장한 상권이 없습니다.</div>
            <p className="text-[#6B726D] mb-6">추천 목록에서 마음에 드는 상권을 저장해보세요.</p>
            <Link
              to="/recommendations"
              className="inline-flex items-center justify-center bg-[#173F35] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#0f2c25]"
            >
              추천 보러가기
            </Link>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((item) => (
              <article key={item.id} className="bg-white border border-[#D9DED7] rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between gap-4 mb-4">
                  <div>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#2F7565] bg-[#E8F3EF] px-2 py-1 rounded-full mb-2">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      저장됨
                    </div>
                    <h2 className="text-xl font-bold text-[#17211D]">{item.areaName}</h2>
                    <p className="text-xs text-[#6B726D] mt-1">행정동 코드 {item.areaCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSavedArea(item.id)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#D9DED7] text-[#6B726D] hover:bg-red-50 hover:text-red-700"
                    aria-label={`${item.areaName} 저장 삭제`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  <Metric label="타깃 매출비율" value={formatPercent(item.metrics.targetSalesRatio ?? undefined)} />
                  <Metric label="카페전환효율" value={formatPercent(item.metrics.cafeConversionRate ?? undefined, 2)} />
                  <Metric label="타깃 유동인구" value={formatNumber(item.metrics.targetFootTraffic ?? undefined)} />
                  <Metric label="객단가" value={formatWon(item.metrics.averageTicket ?? undefined)} />
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => addToComparison(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D9DED7] text-sm font-bold text-[#17211D] hover:bg-[#F7F6F1]"
                  >
                    <Plus className="w-4 h-4" />
                    비교 추가
                  </button>
                  <Link
                    to={`/detail/${item.areaCode}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#173F35] text-sm font-bold text-white hover:bg-[#0f2c25]"
                  >
                    상세 보기
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F6F1] rounded-lg p-3">
      <div className="text-[11px] text-[#6B726D] mb-1">{label}</div>
      <div className="text-sm font-bold text-[#17211D]">{value}</div>
    </div>
  );
}
