const http = require("http");
const {
  compareAreas,
  getAreaDetailWithAi,
  getMeta,
  getRecommendationsWithAi,
  getTimeOption,
  searchAreas,
} = require("./dataStore");

const PORT = Number(process.env.PORT ?? 4000);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, {
    error: true,
    message,
  });
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method !== "GET") {
    sendError(res, 405, "GET 요청만 지원합니다.");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "/health" || pathname === "/api/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (pathname === "/api/meta") {
    sendJson(res, 200, getMeta());
    return;
  }

  if (pathname === "/api/recommendations" || pathname === "/api/recommend") {
    if (!getTimeOption(query.time || "evening")) {
      sendError(res, 400, "올바르지 않은 시간대입니다.");
      return;
    }

    sendJson(res, 200, await getRecommendationsWithAi(query));
    return;
  }

  if (pathname === "/api/areas") {
    sendJson(res, 200, searchAreas(query.query || query.keyword, query.limit));
    return;
  }

  if (pathname === "/api/compare") {
    const areaA = query.areaA || query.dongA;
    const areaB = query.areaB || query.dongB;

    if (!areaA || !areaB) {
      sendError(res, 400, "areaA와 areaB가 필요합니다.");
      return;
    }

    const result = compareAreas(areaA, areaB, query);
    if (!result) {
      sendError(res, 404, "비교할 상권 또는 시간대를 찾을 수 없습니다.");
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  const detailMatch = pathname.match(/^\/api\/areas\/([^/]+)$/);
  if (detailMatch) {
    const result = await getAreaDetailWithAi(
      detailMatch[1],
      query.time || "evening",
      query.ai,
      query
    );
    if (!result) {
      sendError(res, 404, "상권 또는 시간대를 찾을 수 없습니다.");
      return;
    }

    sendJson(res, 200, result);
    return;
  }

  sendError(res, 404, "API 경로를 찾을 수 없습니다.");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendError(res, 500, "서버가 요청을 처리하지 못했습니다.");
  });
});

server.listen(PORT, () => {
  console.log(`황금을 찾아라 API 서버 실행 중: http://localhost:${PORT}`);
});
