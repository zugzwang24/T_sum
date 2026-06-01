function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(error);

  res.status(error.statusCode || 500).json({
    error: true,
    message: error.message || "서버가 요청을 처리하지 못했습니다.",
  });
}

module.exports = errorMiddleware;

