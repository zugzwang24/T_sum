const {
  deleteSavedArea,
  listSavedAreas,
  saveArea,
} = require("../services/savedArea.service");

async function getSavedAreas(req, res) {
  res.json(await listSavedAreas(req.user.id));
}

async function createSavedArea(req, res) {
  res.status(201).json(await saveArea(req.user.id, req.body || {}));
}

async function removeSavedArea(req, res) {
  res.json(await deleteSavedArea(req.user.id, req.params.id));
}

module.exports = {
  createSavedArea,
  getSavedAreas,
  removeSavedArea,
};
