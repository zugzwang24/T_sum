const { createHttpError } = require("../utils/httpError");

const DEFAULT_TOURISM_LIMIT = 4;
const MAX_TOURISM_LIMIT = 10;

function normalizeQueryText(value, label, maxLength) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw createHttpError(400, `${label} 형식이 올바르지 않습니다.`);
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw createHttpError(400, `${label}은(는) ${maxLength}자 이하로 입력해주세요.`);
  }

  return normalized;
}

function parseLimit(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_TOURISM_LIMIT;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw createHttpError(400, "limit은 정수로 입력해주세요.");
  }

  const limit = Number(value);
  if (limit < 1 || limit > MAX_TOURISM_LIMIT) {
    throw createHttpError(
      400,
      `limit은 1 이상 ${MAX_TOURISM_LIMIT} 이하로 입력해주세요.`
    );
  }

  return limit;
}

function parseTourismRecommendationQuery(query = {}) {
  const businessType = normalizeQueryText(query.businessType, "업종", 80);
  const area = normalizeQueryText(query.area, "상권", 120);

  if (!businessType && !area) {
    throw createHttpError(400, "업종 또는 상권 정보를 하나 이상 입력해주세요.");
  }

  return {
    businessType,
    area,
    limit: parseLimit(query.limit),
  };
}

module.exports = {
  DEFAULT_TOURISM_LIMIT,
  MAX_TOURISM_LIMIT,
  parseTourismRecommendationQuery,
};
