const { createHttpError } = require("./query.schema");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterBody(body = {}) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const name = body.name === undefined || body.name === null ? null : String(body.name).trim();

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "올바른 이메일을 입력해주세요.");
  }
  if (password.length < 8) {
    throw createHttpError(400, "비밀번호는 8자 이상이어야 합니다.");
  }
  if (name && name.length > 80) {
    throw createHttpError(400, "이름은 80자 이하로 입력해주세요.");
  }

  return { email, password, name };
}

function validateLoginBody(body = {}) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "올바른 이메일을 입력해주세요.");
  }
  if (!password) {
    throw createHttpError(400, "비밀번호를 입력해주세요.");
  }

  return { email, password };
}

module.exports = {
  validateLoginBody,
  validateRegisterBody,
};

