const { loginUser, registerUser } = require("../services/auth.service");
const {
  validateLoginBody,
  validateRegisterBody,
} = require("../schemas/auth.schema");

async function register(req, res) {
  const body = validateRegisterBody(req.body);
  const result = await registerUser(body);
  res.status(201).json(result);
}

async function login(req, res) {
  const body = validateLoginBody(req.body);
  const result = await loginUser(body);
  res.json(result);
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  login,
  me,
  register,
};

