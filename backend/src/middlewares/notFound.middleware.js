function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: true,
    message: "API 경로를 찾을 수 없습니다.",
  });
}

module.exports = notFoundMiddleware;

