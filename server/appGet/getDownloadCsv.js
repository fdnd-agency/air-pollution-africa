const getDb = require("../db/getDb");
const csvEscape = require("../helpers/csvEscape");

function flattenObject(obj, prefix = "", res = {}) {
  for (const [key, value] of Object.entries(obj || {})) {
    if (key === "_id") continue;
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value instanceof Date) {
      res[newKey] = value.toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}

async function loadPoints(db) {
  const pointsCol = db.collection("Points");
  let points = await pointsCol.find({}).toArray();
  if (points.length > 0) return points;

  // fallback
  const legacyCol = db.collection("Data");
  points = await legacyCol.find({}).toArray();
  return points;
}

module.exports = async function getDownloadCsv(req, res, next) {
  try {
    const db = await getDb();
    const points = await loadPoints(db);

    const rows = [];

    for (const p of points) {
      const measurements = Array.isArray(p.measurements) ? p.measurements : [];

      const { measurements: _drop, ...pointWithoutMeasurements } = p;
      const flatPoint = flattenObject(pointWithoutMeasurements);

      if (measurements.length === 0) {
        rows.push({ ...flatPoint });
        continue;
      }

      for (const m of measurements) {
        const flatMeas = flattenObject(m, "measurement");
        rows.push({ ...flatPoint, ...flatMeas });
      }
    }

    // Altijd headers (ook als rows leeg is)
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    if (headers.length === 0) {
      // minimale set zodat je niet een “leeg” CSV krijgt
      headers.push("point_number", "location", "city", "coordinates.lat", "coordinates.lon", "measurement.tube_id");
    }

    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(headers.map(h => csvEscape(r[h] ?? "")).join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="data.csv"');
    res.status(200).send(lines.join("\n"));
  } catch (err) {
    next(err);
  }
};
