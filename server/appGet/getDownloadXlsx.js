const ExcelJS = require("exceljs");
const getDb = require("../db/getDb");

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

module.exports = async function getDownloadXlsx(req, res, next) {
  try {
    const db = await getDb();
    const points = await loadPoints(db);

    const wb = new ExcelJS.Workbook();

    const ws = wb.addWorksheet("Export");

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
        rows.push({ ...flatPoint, ...flattenObject(m, "measurement") });
      }
    }

    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    if (headers.length === 0) {
      headers.push("point_number", "location", "city", "coordinates.lat", "coordinates.lon", "measurement.tube_id");
    }

    ws.columns = headers.map(h => ({ header: h, key: h }));
    rows.forEach(r => ws.addRow(r));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="data.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
