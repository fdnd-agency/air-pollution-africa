const getDb = require("../db/getDb");
const { buildPublicDataPipeline } = require("../../publicData");
const keuzes = require("../../public/data/keuzes.json");

module.exports = async function getIndex(req, res, next) {
  try {
    const db = await getDb();
    const collection = db.collection("Data");

    const q = { includeMeasurements: "true", limit: "200", page: "1" };
    const { pipeline } = buildPublicDataPipeline(q);
    const items = await collection.aggregate(pipeline).toArray();

    res.render("pages/index", {
      keuzes: keuzes || {},
      initialPoints: items || [],
    });
  } catch (err) {
    next(err);
  }
};
