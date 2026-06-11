const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma.service");

const SALT_ROUNDS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET 환경변수가 필요합니다.");
    error.statusCode = 500;
    throw error;
  }
  return secret;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

async function registerUser({ email, password, name }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    const error = new Error("이미 가입된 이메일입니다.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
    },
  });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    error.statusCode = 401;
    throw error;
  }

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user ? sanitizeUser(user) : null;
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  getUserById,
  loginUser,
  registerUser,
  sanitizeUser,
  verifyToken,
};

