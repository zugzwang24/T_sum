function createHttpError(statusCode, message, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;

  if (details !== null) {
    error.details = details;
  }

  return error;
}

module.exports = {
  createHttpError,
};
