function getApiInfo(req, res) {
  res.json({
    service: "황금을 찾아라 API",
    status: "ok",
    endpoints: {
      health: "/api/health",
      meta: "/api/meta",
      recommendations: "/api/recommendations?time=evening&targetAges=20,30&limit=10",
      recommendationAlias: "/api/recommend?time=evening&targetAges=20,30&limit=10",
      areas: "/api/areas?query=서교",
      areaDetail: "/api/areas/11440660?time=evening&targetAges=20,30",
      compare: "/api/compare?areaA=11440660&areaB=11410585&time=evening&targetAges=20,30",
    },
  });
}

module.exports = {
  getApiInfo,
};

