const express = require("express");
const requireApiKeyStrict = require("../helpers/requireApiKeyStrict");
const getDb = require("../db/getDb");
const { buildPublicDataPipeline } = require("../../publicData");

const router = express.Router();

router.use(requireApiKeyStrict);

router.get("/data", async (req, res, next) => {
  try {
    const { pipeline, page, limit } = buildPublicDataPipeline(req.query);

    const db = await getDb();
    const collection = db.collection("Data");

    const items = await collection.aggregate(pipeline).toArray();

    const pipelineNoSkipLimit = pipeline.slice(0, -2);
    const countArr = await collection
      .aggregate([...pipelineNoSkipLimit, { $count: "count" }])
      .toArray();

    const totalCount = countArr[0]?.count ?? 0;

    res.json({ page, limit, count: totalCount, items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
