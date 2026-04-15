// publicData.js

function parseMonthToUTC(monthStr) {
  // verwacht "YYYY-MM"
  if (typeof monthStr !== "string") return null;
  const m = monthStr.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]); // 1..12

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;

  // eerste dag van de maand, UTC
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function addMonthsUTC(date, monthsToAdd) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthsToAdd, 1, 0, 0, 0, 0));
}

function parseBool(v) {
  if (v === true || v === false) return v;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

function clampInt(n, min, max, fallback) {
  const x = parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function buildPublicDataPipeline(query) {
  // --- pagination ---
  const page = clampInt(query.page, 1, 1000000, 1);
  const limit = clampInt(query.limit, 1, 200, 50);
  const skip = (page - 1) * limit;

  // --- active filter ---
  const activeParam = (query.active || "all").toString().trim().toLowerCase();
  let activeFilter = {};
  if (activeParam === "true") activeFilter = { active: true };
  else if (activeParam === "false") activeFilter = { active: false };
  // else all -> geen filter

  // --- point number filter ---
  const point = query.point ? parseInt(query.point, 10) : null;
  const pointMin = query.pointMin ? parseInt(query.pointMin, 10) : null;
  const pointMax = query.pointMax ? parseInt(query.pointMax, 10) : null;

  let pointFilter = {};
  if (Number.isFinite(point)) {
    pointFilter = { point_number: point };
  } else if (Number.isFinite(pointMin) || Number.isFinite(pointMax)) {
    pointFilter.point_number = {};
    if (Number.isFinite(pointMin)) pointFilter.point_number.$gte = pointMin;
    if (Number.isFinite(pointMax)) pointFilter.point_number.$lte = pointMax;
  }

  // --- start_date month filter (optioneel) ---
  const startFrom = parseMonthToUTC(query.startFrom);
  const startTo = parseMonthToUTC(query.startTo);
  let startFilter = {};
  if (startFrom || startTo) {
    startFilter.start_date = {};
    if (startFrom) startFilter.start_date.$gte = startFrom;
    if (startTo) startFilter.start_date.$lt = addMonthsUTC(startTo, 1);
  }

  // --- measurements filter ---
  const includeMeasurements = parseBool(query.includeMeasurements);
  // ✅ default: false (API is light by default)
  const includeM = includeMeasurements === null ? false : includeMeasurements;

  const mFrom = parseMonthToUTC(query.mFrom);
  const mTo = parseMonthToUTC(query.mTo);
  const mToExclusive = mTo ? addMonthsUTC(mTo, 1) : null;

  const latestOnly = parseBool(query.latestOnly) === true;
  const mLimit = clampInt(query.mLimit, 1, 24, 24);

  // --- match stage ---
  const match = { ...activeFilter, ...pointFilter, ...startFilter };

  // --- project zonder _id ---
  const baseProjectWithMeasurements = {
    _id: 0,
    point_number: 1,
    location: 1,
    coordinates: 1,
    description: 1,
    start_date: 1,
    active: 1,
    measurements: 1
  };

  const baseProjectNoMeasurements = {
    _id: 0,
    point_number: 1,
    location: 1,
    coordinates: 1,
    description: 1,
    start_date: 1,
    active: 1
  };

  const pipeline = [{ $match: match }, { $sort: { point_number: 1 } }];

  if (!includeM) {
    pipeline.push({ $project: baseProjectNoMeasurements });
  } else if (mFrom || mToExclusive) {
    const cond = [];
    if (mFrom) cond.push({ $gte: ["$$m.date", mFrom] });
    if (mToExclusive) cond.push({ $lt: ["$$m.date", mToExclusive] });

    pipeline.push({
      $addFields: {
        measurements: {
          $filter: {
            input: "$measurements",
            as: "m",
            cond: cond.length === 1 ? cond[0] : { $and: cond }
          }
        }
      }
    });

    pipeline.push({
      $addFields: {
        measurements: {
          $slice: [
            { $sortArray: { input: "$measurements", sortBy: { date: -1 } } },
            latestOnly ? 1 : mLimit
          ]
        }
      }
    });

    pipeline.push({ $addFields: { measurements: { $reverseArray: "$measurements" } } });
    pipeline.push({ $project: baseProjectWithMeasurements });
  } else {
    if (latestOnly || mLimit !== 24) {
      pipeline.push({
        $addFields: {
          measurements: {
            $slice: [
              { $sortArray: { input: "$measurements", sortBy: { date: -1 } } },
              latestOnly ? 1 : mLimit
            ]
          }
        }
      });
      pipeline.push({ $addFields: { measurements: { $reverseArray: "$measurements" } } });
    }
    pipeline.push({ $project: baseProjectWithMeasurements });
  }

  pipeline.push({ $skip: skip }, { $limit: limit });

  return { pipeline, page, limit };
}

module.exports = {
  buildPublicDataPipeline,
  parseMonthToUTC
};
