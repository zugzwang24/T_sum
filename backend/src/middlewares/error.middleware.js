function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(error);

  const payload = {
    error: true,
    message: error.message || "서버가 요청을 처리하지 못했습니다.",
  };

  if (error.categories) {
    payload.categories = error.categories;
  }

  res.status(error.statusCode || 500).json(payload);
}

module.exports = errorMiddleware;
