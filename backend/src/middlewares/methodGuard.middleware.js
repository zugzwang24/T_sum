const ALLOWED_MUTATIONS = [
  { method: "POST", pattern: /^\/api\/auth\/(register|login)$/ },
  { method: "POST", pattern: /^\/api\/saved-areas$/ },
  { method: "DELETE", pattern: /^\/api\/saved-areas\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/comparisons$/ },
  { method: "POST", pattern: /^\/api\/comparisons\/[^/]+\/items$/ },
  { method: "DELETE", pattern: /^\/api\/comparisons\/[^/]+\/items\/[^/]+$/ },
];

function methodGuardMiddleware(req, res, next) {
  const isAllowedMutation = ALLOWED_MUTATIONS.some(
    (rule) => req.method === rule.method && rule.pattern.test(req.path)
  );

  if (req.method !== "GET" && !isAllowedMutation) {
    res.status(405).json({
      error: true,
      message: "허용되지 않은 API 메서드입니다.",
    });
    return;
  }

  next();
}

module.exports = methodGuardMiddleware;
