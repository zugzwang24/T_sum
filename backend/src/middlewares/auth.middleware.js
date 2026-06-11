const { createHttpError } = require("../schemas/query.schema");
const { getUserById, verifyToken } = require("../services/auth.service");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

async function attachUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  const user = await getUserById(payload.sub);
  if (!user) {
    throw createHttpError(401, "인증 정보가 유효하지 않습니다.");
  }

  req.user = user;
  return user;
}

async function requireAuth(req, res, next) {
  try {
    const user = await attachUser(req);
    if (!user) {
      throw createHttpError(401, "로그인이 필요합니다.");
    }
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = "인증 정보가 유효하지 않습니다.";
    }
    next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    await attachUser(req);
    next();
  } catch {
    req.user = null;
    next();
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
};

