const { getMeta } = require("../services/dataStore.service");
const { listAvailableCategories } = require("../services/areaFeature.service");

async function getServiceMeta(req, res) {
  const meta = getMeta();
  const categories = await listAvailableCategories();

  res.json({
    ...meta,
    categories,
  });
}

module.exports = {
  getServiceMeta,
};
