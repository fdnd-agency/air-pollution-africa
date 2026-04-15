const express = require("express");
const { ObjectId } = require("mongodb");

const getDb = require("../db/getDb");
const requireUserInUsers = require("../helpers/requireUserInUsers");

const keuzes = require("../../public/data/keuzes.json");

const MEASUREMENT_MIN = 0;
const MEASUREMENT_MAX = 200;

const router = express.Router();
router.use(requireUserInUsers);

// Admin-only read endpoints (voor beheer UI)
router.get("/keuzes", (req, res) => res.json(keuzes));

// Admin: nieuw meetpunt aanmaken
router.post("/points", async (req, res, next) => {
  try {
    const { description, lat, lon, startDate, firstValue } = req.body;

    if (!description || lat == null || lon == null || !startDate) {
      return res.status(400).json({ error: "description, lat, lon and startDate are required." });
    }

    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ error: "lat and lon must be valid numbers." });
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "startDate must be a valid date (YYYY-MM-DD)." });
    }

    const db = await getDb();
    const collection = db.collection("Data");

    const last = await collection.find({}).sort({ point_number: -1 }).limit(1).toArray();
    let nextPointNumber = 1;
    if (last.length && typeof last[0].point_number === "number") nextPointNumber = last[0].point_number + 1;

    const now = new Date();

    const doc = {
      point_number: nextPointNumber,
      coordinates: { lat: latNum, lon: lonNum },
      description: String(description).trim(),
      start_date: start,
      measurements: [],
      active: true,
      createdAt: now,
    };

    if (firstValue !== undefined && firstValue !== null && firstValue !== "") {
      const cleaned = String(firstValue).replace(",", ".");
      const v = Number(cleaned);

      if (!Number.isFinite(v) || v < MEASUREMENT_MIN || v > MEASUREMENT_MAX) {
        return res.status(400).json({
          error: `firstValue must be a number between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (µg/m³).`,
        });
      }

      doc.measurements.push({ date: start, value: v, createdAt: now });
    }

    const result = await collection.insertOne(doc);
    const inserted = await collection.findOne({ _id: result.insertedId });

    return res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/data", async (req, res, next) => {
  try {
    const db = await getDb();
    const collection = db.collection("Data");
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// Users management
router.post("/users", async (req, res, next) => {
  try {
    let { email } = req.body;
    email = (email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required." });

    const db = await getDb();
    const usersCollection = db.collection("Users");

    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(409).json({ error: "User already exists." });

    const now = new Date();
    const result = await usersCollection.insertOne({ email, createdAt: now });

    res.status(201).json({
      _id: result.insertedId.toString(),
      email,
      createdAt: now.toISOString(),
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const db = await getDb();
    const usersCollection = db.collection("Users");

    const users = await usersCollection.find({}).sort({ email: 1 }).toArray();
    const cleaned = users.map((u) => ({
      _id: u._id.toString(),
      email: u.email,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }));

    res.json(cleaned);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid user id." });

    const db = await getDb();
    const usersCollection = db.collection("Users");
    const loginCodesCollection = db.collection("LoginCodes");

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return res.status(404).json({ error: "User not found." });

    await loginCodesCollection.deleteMany({ userId: id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// Batch measurements
router.post("/measurements/batch", async (req, res, next) => {
  try {
    const { year, month, entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "Invalid payload: entries must be an array." });
    }

    const y = Number(year);
    const m = Number(month);

    if (!Number.isFinite(y) || y < 2000 || y > 2100 || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "Invalid payload: year/month required." });
    }

    const db = await getDb();
    const collection = db.collection("Data");

    const measurementDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const bulkOps = [];

    for (const [index, entry] of entries.entries()) {
      const pointId = entry.pointId;
      if (!pointId || !ObjectId.isValid(pointId)) continue;

      const tubeId = entry.tube_id === null || entry.tube_id === undefined ? "" : String(entry.tube_id).trim();
      if (!tubeId) {
        return res.status(400).json({
          error: "tube_id is required for each measurement.",
          index,
        });
      }

      const rawValueString =
        entry.value === null || entry.value === undefined ? "" : String(entry.value).trim();

      const hasValue = rawValueString !== "";
      const hasNoMeasurement = !!entry.noMeasurement;

      if (!hasValue && !hasNoMeasurement) {
        return res.status(400).json({
          error: "Each measurement must either have a value or be marked as 'no measurement'.",
          index,
        });
      }

      if (hasValue && hasNoMeasurement) {
        return res.status(400).json({
          error: "A measurement cannot have both a numeric value and 'no measurement' at the same time.",
          index,
        });
      }

      let value = null;

      if (hasValue) {
        const cleaned = rawValueString.replace(",", ".");
        const num = Number(cleaned);

        if (!Number.isFinite(num) || num < MEASUREMENT_MIN || num > MEASUREMENT_MAX) {
          return res.status(400).json({
            error: `Measurement values must be between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (µg/m³).`,
            index,
          });
        }

        value = num;
      }

      // ✅ tube_id opslaan op measurement
      const measurementDoc = { date: measurementDate, tube_id: tubeId };
      if (hasNoMeasurement) measurementDoc.noMeasurement = true;
      else measurementDoc.value = value;

      bulkOps.push({
        updateOne: {
          filter: { _id: new ObjectId(pointId) },
          update: { $push: { measurements: measurementDoc } },
        },
      });
    }

    if (!bulkOps.length) return res.status(400).json({ error: "No valid entries to save." });

    const result = await collection.bulkWrite(bulkOps);

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      savedPeriod: { year: y, month: m },
      measurementDateUTC: measurementDate.toISOString(),
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// Point active toggle
router.patch("/points/:id/active", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid point id." });

    const isActive = !!active;

    const db = await getDb();
    const collection = db.collection("Data");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { active: isActive } }
    );

    if (!result.matchedCount) return res.status(404).json({ error: "Measurement point not found." });

    res.json({ success: true, active: isActive });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
