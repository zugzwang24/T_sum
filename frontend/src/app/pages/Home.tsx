import { Link } from "react-router";
import { ArrowRight, CheckCircle2, ChevronRight, MapPin, BarChart3, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import heroImg from "../../imports/image.png";

const CATEGORY_OPTIONS = [
  { code: "COFFEE_BEVERAGE", label: "커피-음료" },
  { code: "KOREAN_FOOD", label: "한식" },
  { code: "CHICKEN", label: "치킨" },
  { code: "BAKERY", label: "제과점" },
  { code: "CONVENIENCE_STORE", label: "편의점" },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["점심 11~14"]);
  const [selectedAges, setSelectedAges] = useState<string[]>(["20대", "30대"]);

  const toggleTime = (time: string) => {
    setSelectedTimes(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]);
  };

  const toggleAge = (age: string) => {
    setSelectedAges(prev => prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]);
  };

  const recommendationPath = `/recommendations?category=${selectedCategory.code}`;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-6 text-center lg:text-left mb-16 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#D9DED7] text-[#2F7565] text-sm font-semibold mb-6 shadow-sm">
                <MapPin className="w-4 h-4" />
                <span>서울 공공데이터 기반 상권 추천</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#173F35] tracking-tight leading-tight mb-6">
                내 업종에 맞는 서울 상권, <br className="hidden lg:block" />
                <span className="text-[#C99728]">데이터로 먼저</span> 찾아보세요
              </h1>
              <p className="text-lg text-[#6B726D] mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                업종, 운영 시간대, 타깃 연령대, 매출 전환 효율, 데이터 신뢰도를 종합해
                창업 후보 상권을 추천합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to={recommendationPath}
                  className="inline-flex items-center justify-center gap-2 bg-[#173F35] text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#0f2c25] transition-colors shadow-lg"
                >
                  바로 추천받기
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#17211D] border border-[#D9DED7] px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  분석 방식 보기
                </a>
              </div>
            </div>

            {/* Hero Preview Card */}
            <div className="lg:col-span-6 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#FFF3D8] to-transparent opacity-50 rounded-3xl transform rotate-3 scale-105"></div>
              <div className="relative mb-6 rounded-3xl overflow-hidden shadow-lg">
                <ImageWithFallback src={heroImg} alt="상권 분석 대시보드 예시" className="w-full h-auto object-cover max-h-[300px]" />
              </div>
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-[#D9DED7] relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#C99728] text-white flex items-center justify-center font-bold text-xl">1</div>
                      <h3 className="text-2xl font-bold text-[#17211D]">서교동</h3>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] text-green-700 text-sm font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      안정 추천 · 신뢰도 98점
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-[#173F35]">73.5<span className="text-xl text-[#6B726D] font-medium">점</span></div>
                    <div className="text-sm text-[#C99728] font-bold mt-1">상위 1%</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#F7F6F1] p-4 rounded-xl flex justify-between items-center">
                    <span className="text-[#6B726D] font-medium">타깃 매출비율</span>
                    <span className="text-[#17211D] font-bold text-lg">70.0%</span>
                  </div>
                  <div className="bg-[#F7F6F1] p-4 rounded-xl flex justify-between items-center">
                    <span className="text-[#6B726D] font-medium">업종전환효율</span>
                    <span className="text-[#17211D] font-bold text-lg">4.24%</span>
                  </div>
                  <div className="bg-[#F7F6F1] p-4 rounded-xl flex justify-between items-center">
                    <span className="text-[#6B726D] font-medium">선택시간 매출</span>
                    <span className="text-[#17211D] font-bold text-lg">29.7%</span>
                  </div>
                  <div className="bg-[#F7F6F1] p-4 rounded-xl flex justify-between items-center">
                    <span className="text-[#6B726D] font-medium">객단가</span>
                    <span className="text-[#17211D] font-bold text-lg">9,099원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Recommendation Form */}
      <section className="py-16 bg-white border-y border-[#D9DED7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#173F35]">어떤 업종을 준비하고 있나요?</h2>
            <p className="text-[#6B726D] mt-2">업종과 조건을 선택하면 맞춤형 상권을 추천해 드립니다.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-[#D9DED7] p-6 md:p-8">
            {/* Category */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#17211D] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2F7565]" />
                분석 업종
              </h3>
              <div className="flex flex-wrap gap-3">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.code}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      selectedCategory.code === category.code
                        ? "bg-[#173F35] text-white shadow-md transform scale-105"
                        : "bg-[#F7F6F1] text-[#6B726D] hover:bg-[#EAE8E1]"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#17211D] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2F7565]" />
                주요 운영 시간대
              </h3>
              <div className="flex flex-wrap gap-3">
                {["새벽 00~06", "오전 06~11", "점심 11~14", "오후 14~17", "저녁 17~21", "심야 21~24"].map((time) => (
                  <button
                    key={time}
                    onClick={() => toggleTime(time)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      selectedTimes.includes(time)
                        ? "bg-[#173F35] text-white shadow-md transform scale-105"
                        : "bg-[#F7F6F1] text-[#6B726D] hover:bg-[#EAE8E1]"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#17211D] mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#2F7565]" />
                메인 타깃 연령대
              </h3>
              <div className="flex flex-wrap gap-3">
                {["10대", "20대", "30대", "40대", "50대", "60대+"].map((age) => (
                  <button
                    key={age}
                    onClick={() => toggleAge(age)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      selectedAges.includes(age)
                        ? "bg-[#C99728] text-white shadow-md transform scale-105"
                        : "bg-[#F7F6F1] text-[#6B726D] hover:bg-[#EAE8E1]"
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-8 flex flex-col sm:flex-row gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-5 h-5 rounded border-2 border-[#D9DED7] group-hover:border-[#C99728] flex items-center justify-center bg-white transition-colors">
                  <div className="w-3 h-3 bg-[#C99728] rounded-sm"></div>
                </div>
                <span className="text-[#17211D] font-medium">이상치 보정 점수 사용</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-5 h-5 rounded border-2 border-[#D9DED7] group-hover:border-[#C99728] flex items-center justify-center bg-white transition-colors">
                  <div className="w-3 h-3 bg-[#C99728] rounded-sm"></div>
                </div>
                <span className="text-[#17211D] font-medium">안정 추천만 보기</span>
              </label>
            </div>

            <Link
              to={recommendationPath}
              className="block w-full text-center bg-[#C99728] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#b08423] transition-colors shadow-lg"
            >
              상권 추천 결과 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#F7F6F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D9DED7]">
              <div className="w-12 h-12 bg-[#FFF3D8] rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-[#C99728]" />
              </div>
              <h3 className="text-xl font-bold text-[#173F35] mb-3">실제 구매 전환 반영</h3>
                <p className="text-[#6B726D] leading-relaxed">
                단순 유동인구가 아닌, 실제로 선택 업종에서 소비가 일어나는 전환 효율을 분석하여 알짜 상권을 찾아냅니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D9DED7]">
              <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-[#2F7565]" />
              </div>
              <h3 className="text-xl font-bold text-[#173F35] mb-3">시간대별 수요 분석</h3>
              <p className="text-[#6B726D] leading-relaxed">
                사장님이 집중하고 싶은 영업 시간대에 매출이 활발하게 일어나는 맞춤형 상권을 매칭해 드립니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D9DED7]">
              <div className="w-12 h-12 bg-[#F1F5F9] rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#173F35] mb-3">데이터 신뢰도 보정</h3>
              <p className="text-[#6B726D] leading-relaxed">
                결측치나 이상치가 있는 불안정한 데이터를 걸러내고, 믿을 수 있는 통계에 기반한 상권만 추천합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Ranking Table Section */}
      <section className="py-20 bg-white border-y border-[#D9DED7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#173F35] mb-4">어떤 상권이 추천되나요?</h2>
            <p className="text-[#6B726D]">실제 데이터 기반 추천 결과 예시입니다.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#D9DED7] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F6F1] border-b border-[#D9DED7]">
                    <th className="px-6 py-4 font-bold text-[#17211D]">순위</th>
                    <th className="px-6 py-4 font-bold text-[#17211D]">상권명</th>
                    <th className="px-6 py-4 font-bold text-[#17211D]">추천 점수</th>
                    <th className="px-6 py-4 font-bold text-[#17211D]">신뢰도</th>
                    <th className="px-6 py-4 font-bold text-[#17211D]">핵심 이유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9DED7]">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#C99728] text-white flex items-center justify-center font-bold">1</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#173F35] text-lg">서교동</td>
                    <td className="px-6 py-4 font-bold text-xl text-[#17211D]">73.5</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                        <ShieldCheck className="w-4 h-4" /> 98점
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B726D]">2030 타깃 매출비율 70%, 높은 업종 전환효율</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#6B726D] text-white flex items-center justify-center font-bold">2</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#173F35] text-lg">역삼1동</td>
                    <td className="px-6 py-4 font-bold text-xl text-[#17211D]">68.2</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                        <ShieldCheck className="w-4 h-4" /> 95점
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B726D]">점심 시간대(11~14시) 압도적 매출 비중</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#6B726D] text-white flex items-center justify-center font-bold">3</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#173F35] text-lg">신촌동</td>
                    <td className="px-6 py-4 font-bold text-xl text-[#17211D]">65.8</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                        <ShieldCheck className="w-4 h-4" /> 92점
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B726D]">20대 타깃 객단가 우수, 안정적 유동인구</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-[#F7F6F1] px-6 py-4 text-center border-t border-[#D9DED7]">
              <Link to="/recommendations" className="text-[#2F7565] font-bold hover:text-[#173F35] inline-flex items-center gap-1">
                전체 순위 보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section id="how-it-works" className="py-20 bg-[#173F35] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">황금을 찾아라 분석 방식</h2>
            <p className="text-[#D9DED7]">5단계의 체계적인 데이터 분석을 통해 상권을 추천합니다.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { num: "1", title: "서울 공공데이터 수집", desc: "서울시 상권분석서비스 등 공신력 있는 데이터를 수집합니다." },
              { num: "2", title: "행정동별 매출·유동인구 전처리", desc: "데이터를 행정동 단위로 병합하고 결측치를 처리합니다." },
              { num: "3", title: "조건별 추천 점수 계산", desc: "선택한 시간대와 연령대에 가중치를 부여해 점수를 산출합니다." },
              { num: "4", title: "데이터 신뢰도 보정", desc: "극단적인 이상치를 보정하고 데이터 안정성을 평가합니다." },
              { num: "5", title: "AI 해설 제공", desc: "복잡한 수치를 이해하기 쉬운 인사이트로 변환해 제공합니다." }
            ].map((step, idx) => (
              <div key={idx} className="relative">
                {idx < 4 && <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-[#2F7565]"></div>}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#C99728] flex items-center justify-center font-bold text-xl mb-4 shadow-lg border-4 border-[#173F35]">
                    {step.num}
                  </div>
                  <h4 className="font-bold text-lg mb-2 text-[#FFF3D8]">{step.title}</h4>
                  <p className="text-sm text-[#D9DED7]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-gradient-to-br from-[#FFF3D8] to-[#F7F6F1] border-t border-[#D9DED7]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="w-12 h-12 text-[#C99728] mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-[#173F35] mb-6">
            지금 내 업종과 조건에 맞는 상권을 찾아보세요
          </h2>
          <Link
            to={recommendationPath}
            className="inline-flex items-center justify-center gap-2 bg-[#173F35] text-white px-10 py-5 rounded-xl text-xl font-bold hover:bg-[#0f2c25] transition-colors shadow-xl transform hover:scale-105"
          >
            추천 시작하기
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>
    </div>
  );
}
