const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const { createApp } = require("../src/app");
const {
  SAMPLE_TOURISM_RESOURCES,
} = require("../src/services/tourismRecommendation.service");

describe("관광 연계 추천 샘플 데이터", () => {
  it("조치원역·지역 축제·문화시설을 포함한 샘플 4건 이상을 제공한다", () => {
    assert.ok(SAMPLE_TOURISM_RESOURCES.length >= 4);
    assert.ok(
      SAMPLE_TOURISM_RESOURCES.some(
        (resource) => resource.tourismName === "조치원역"
      )
    );
    assert.ok(
      SAMPLE_TOURISM_RESOURCES.some(
        (resource) => resource.tourismType === "지역 축제"
      )
    );
    assert.ok(
      SAMPLE_TOURISM_RESOURCES.some(
        (resource) => resource.tourismType === "문화시설"
      )
    );
  });
});

describe("GET /api/tourism/recommendations", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  async function requestRecommendations(params) {
    const query = new URLSearchParams(params);
    const response = await fetch(
      `${baseUrl}/api/tourism/recommendations?${query}`
    );
    return {
      response,
      data: await response.json(),
    };
  }

  it("조치원역 인근 카페·음료에는 조치원역을 1순위로 반환한다", async () => {
    const { response, data } = await requestRecommendations({
      businessType: "카페·음료",
      area: "조치원역 인근",
      limit: "4",
    });

    assert.equal(response.status, 200);
    assert.equal(data.sourceType, "mvp-sample");
    assert.match(data.notice, /실제 관광 API 조회 결과가 아닌 MVP 샘플 데이터/);
    assert.equal(data.criteria.businessType, "카페·음료");
    assert.equal(data.criteria.area, "조치원역 인근");
    assert.equal(data.items[0].tourismName, "조치원역");
    assert.equal(data.items[0].tourismType, "교통 거점");
    assert.match(data.items[0].recommendationReason, /대기 시간|휴식 수요/);
    assert.match(data.items[0].promotionIdea, /음료·쿠키 세트/);
    assert.ok(data.items[0].matchedBy.businessType.length > 0);
    assert.ok(data.items[0].matchedBy.area.includes("조치원역"));
    assert.equal(data.emptyMessage, null);

    [
      "id",
      "tourismName",
      "tourismType",
      "location",
      "recommendedBusinessTypes",
      "recommendationReason",
      "promotionIdea",
      "score",
      "matchedBy",
    ].forEach((key) => assert.ok(key in data.items[0]));
  });

  it("상권 키워드가 달라지면 같은 업종의 1순위가 달라진다", async () => {
    const stationResult = await requestRecommendations({
      businessType: "카페·음료",
      area: "조치원역 인근",
    });
    const festivalResult = await requestRecommendations({
      businessType: "카페·음료",
      area: "조치원 복숭아 축제 인근",
    });

    assert.equal(stationResult.data.items[0].tourismName, "조치원역");
    assert.equal(
      festivalResult.data.items[0].tourismName,
      "조치원 복숭아 축제"
    );
    assert.notDeepEqual(
      stationResult.data.items.map((item) => item.id),
      festivalResult.data.items.map((item) => item.id)
    );
  });

  it("업종 조건이 달라지면 추천 결과가 달라진다", async () => {
    const cafeResult = await requestRecommendations({
      businessType: "카페·음료",
      area: "조치원읍",
    });
    const cultureResult = await requestRecommendations({
      businessType: "문화·체험",
      area: "조치원읍",
    });

    assert.ok(cafeResult.data.items.length > cultureResult.data.items.length);
    assert.deepEqual(
      cultureResult.data.items.map((item) => item.tourismName),
      ["세종문화예술회관"]
    );
  });

  it("미매칭 입력에는 빈 배열과 안내 문구를 반환한다", async () => {
    const { response, data } = await requestRecommendations({
      businessType: "우주선 정비",
      area: "강남역",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(data.items, []);
    assert.match(data.emptyMessage, /맞는 MVP 샘플 관광 자원이 없습니다/);
    assert.equal(data.sourceType, "mvp-sample");
  });

  it("limit에 따라 반환 개수를 제한한다", async () => {
    const { response, data } = await requestRecommendations({
      businessType: "카페·음료",
      area: "조치원역 인근",
      limit: "1",
    });

    assert.equal(response.status, 200);
    assert.equal(data.items.length, 1);
    assert.equal(data.criteria.limit, 1);
  });
});
