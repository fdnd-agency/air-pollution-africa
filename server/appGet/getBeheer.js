const getDb = require("../db/getDb");
const { buildPublicDataPipeline } = require("../../publicData");
const keuzes = require("../../public/data/keuzes.json");

module.exports = async function getBeheer(req, res, next) {
  try {
    const db = await getDb();
    const collectionData = db.collection("Data");
    const collectionUsers = db.collection("Users");

    const q = { includeMeasurements: "true", limit: "200", page: "1" };
    const { pipeline } = buildPublicDataPipeline(q);

    const [items, users] = await Promise.all([
      collectionData.aggregate(pipeline).toArray(),
      collectionUsers.find({}).toArray(),
    ]);

    res.render("pages/beheer", {
      keuzes: keuzes || {},
      users: users || [],
      initialPoints: items || [],
    });
  } catch (err) {
    next(err);
  }
};
