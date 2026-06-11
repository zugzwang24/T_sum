const { getTimeOption } = require("../services/dataStore.service");

function createHttpError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function validateTimeQuery(query = {}) {
  if (!getTimeOption(query.time || "evening")) {
    throw createHttpError(400, "올바르지 않은 시간대입니다.");
  }
}

function parseCompareQuery(query = {}) {
  const areaA = query.areaA || query.dongA;
  const areaB = query.areaB || query.dongB;

  if (!areaA || !areaB) {
    throw createHttpError(400, "areaA와 areaB가 필요합니다.");
  }

  return { areaA, areaB };
}

module.exports = {
  createHttpError,
  parseCompareQuery,
  validateTimeQuery,
};
