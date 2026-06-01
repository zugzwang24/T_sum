const { getMeta } = require("../services/dataStore.service");

function getServiceMeta(req, res) {
  res.json(getMeta());
}

module.exports = {
  getServiceMeta,
};

