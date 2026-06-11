function getApiInfo(req, res) {
  res.json({
    service: "황금을 찾아라 API",
    status: "ok",
    endpoints: {
      health: "/api/health",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me",
      savedAreas: "GET/POST /api/saved-areas",
      deleteSavedArea: "DELETE /api/saved-areas/:id",
      comparisons: "GET/POST /api/comparisons",
      comparisonDetail: "GET /api/comparisons/:comparisonId",
      addComparisonItem: "POST /api/comparisons/:comparisonId/items",
      deleteComparisonItem: "DELETE /api/comparisons/:comparisonId/items/:itemId",
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
