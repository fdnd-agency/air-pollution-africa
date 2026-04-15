const getDb = require("../db/getDb");

module.exports = async function getDownloadJson(req, res, next) {
  try {
    const db = await getDb();
    const collection = db.collection("Data");
    const docs = await collection.find({}).project({ _id: 0 }).toArray();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="data.json"');
    res.status(200).send(JSON.stringify(docs, null, 2));
  } catch (err) {
    next(err);
  }
};
