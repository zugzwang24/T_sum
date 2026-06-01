function methodGuardMiddleware(req, res, next) {
  if (req.method !== "GET") {
    res.status(405).json({
      error: true,
      message: "GET 요청만 지원합니다.",
    });
    return;
  }

  next();
}

module.exports = methodGuardMiddleware;
