const {
  addComparisonItem,
  createComparison,
  deleteComparisonItem,
  getComparison,
  listComparisons,
} = require("../services/comparison.service");

async function getComparisons(req, res) {
  res.json(await listComparisons(req.user.id));
}

async function postComparison(req, res) {
  res.status(201).json(await createComparison(req.user.id, req.body || {}));
}

async function getComparisonById(req, res) {
  res.json(await getComparison(req.user.id, req.params.comparisonId));
}

async function postComparisonItem(req, res) {
  res
    .status(201)
    .json(await addComparisonItem(req.user.id, req.params.comparisonId, req.body || {}));
}

async function removeComparisonItem(req, res) {
  res.json(
    await deleteComparisonItem(
      req.user.id,
      req.params.comparisonId,
      req.params.itemId
    )
  );
}

module.exports = {
  getComparisonById,
  getComparisons,
  postComparison,
  postComparisonItem,
  removeComparisonItem,
};
