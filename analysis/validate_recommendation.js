const { getRecommendations } = require("../backend/src/dataStore");

const TIMES = ["morning", "lunch", "afternoon", "evening", "night"];

function printTop(title, result) {
  console.log(`\n[${title}]`);
  result.items.slice(0, 10).forEach((item) => {
    console.log(
      `${item.rank}. ${item.areaName} (${item.areaCode}) - ${item.score}점 / 타깃매출 ${(
        item.metrics.targetSalesRatio * 100
      ).toFixed(1)}% / 전환 ${(item.metrics.conversionRate * 100).toFixed(2)}%`
    );
  });
}

function overlapCount(left, right) {
  const rightCodes = new Set(right.items.map((item) => item.areaCode));
  return left.items.filter((item) => rightCodes.has(item.areaCode)).length;
}

function run() {
  const defaultResult = getRecommendations({
    time: "evening",
    targetAges: "20,30",
    limit: 10,
  });
  printTop("저녁 추천 Top 10 - 2030", defaultResult);

  TIMES.forEach((time) => {
    printTop(`${time} 추천 Top 10 - 2030`, getRecommendations({ time, targetAges: "20,30", limit: 10 }));
  });

  const olderTarget = getRecommendations({
    time: "evening",
    targetAges: "40,50",
    limit: 10,
  });
  printTop("저녁 추천 Top 10 - 4050", olderTarget);

  const adjusted = getRecommendations({
    time: "evening",
    targetAges: "20,30",
    useAdjustedScore: "true",
    limit: 10,
  });
  printTop("저녁 추천 Top 10 - 보정 점수", adjusted);

  console.log(
    `\n[민감도] 기본 점수와 보정 점수 Top 10 겹침: ${overlapCount(defaultResult, adjusted)}개`
  );
  console.log(
    `[민감도] 2030과 4050 Top 10 겹침: ${overlapCount(defaultResult, olderTarget)}개`
  );
}

run();
