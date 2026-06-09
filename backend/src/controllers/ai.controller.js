const {
  buildAreaReport,
  buildCompareSummary,
  buildReliabilityExplanation,
} = require("../services/aiReason.service");

async function createAreaReport(req, res) {
  const result = await buildAreaReport(req.body || {});
  res.json(result);
}

async function createCompareSummary(req, res) {
  const result = await buildCompareSummary(req.body || {});
  res.json(result);
}

async function createReliabilityExplanation(req, res) {
  const result = await buildReliabilityExplanation(req.body || {});
  res.json(result);
}

module.exports = {
  createAreaReport,
  createCompareSummary,
  createReliabilityExplanation,
};
