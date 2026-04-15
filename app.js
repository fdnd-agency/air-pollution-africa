require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

// -------------------- helpers / db --------------------
const getDb = require("./server/db/getDb");

// -------------------- middleware --------------------
const requireUserInUsers = require("./server/helpers/requireUserInUsers");
const requireApiKeyStrict = require("./server/helpers/requireApiKeyStrict");

// -------------------- rate limiters --------------------
const loginLimiter = require("./server/helpers/limiters/loginLimiter");
const verifyCodeLimiter = require("./server/helpers/limiters/verifyCodeLimiter");
const apiKeyRequestLimiter = require("./server/helpers/limiters/apiKeyRequestLimiter");
const apiKeyVerifyLimiter = require("./server/helpers/limiters/apiKeyVerifyLimiter");

// -------------------- GET handlers --------------------
const getIndex = require("./server/appGet/getIndex");
const getData = require("./server/appGet/getData");
const getAbout = require("./server/appGet/getAbout");
const getInfo = require("./server/appGet/getInfo");
const getLogin = require("./server/appGet/getLogin");
const getLoginVerification = require("./server/appGet/getLoginVerification");
const getBeheer = require("./server/appGet/getBeheer");
const getLogout = require("./server/appGet/getLogout");

const getApiKey = require("./server/appGet/getApiKey");
const getApiKeyVerify = require("./server/appGet/getApiKeyVerify");
const getApiKeySuccess = require("./server/appGet/getApiKeySuccess");

const getDownloadJson = require("./server/appGet/getDownloadJson");
const getDownloadCsv = require("./server/appGet/getDownloadCsv");
const getDownloadXlsx = require("./server/appGet/getDownloadXlsx");

// -------------------- POST handlers --------------------
const postLoginForm = require("./server/post/postLoginForm");
const postLoginVerification = require("./server/post/postLoginVerification");
const postApiKeyRequest = require("./server/post/postApiKeyRequest");
const postApiKeyVerify = require("./server/post/postApiKeyVerify");

// -------------------- API routers --------------------
const publicApi = require("./server/api/publicApi");
const adminApi = require("./server/api/adminApi");

// -------------------- Express setup --------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));
app.use("/img", express.static(path.join(__dirname, "public/img")));
app.use("/leafletcss", express.static(path.join(__dirname, "public/css/leaflet")));
app.use("/leafletjs", express.static(path.join(__dirname, "public/js/leaflet")));

// -------------------- session --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB_NAME,
      collectionName: "sessions",
      ttl: 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    },
  })
);

// -------------------- Pages --------------------
app.get("/", getIndex);
app.get("/data", getData);
app.get("/about", getAbout);
app.get("/info", getInfo);

app.get("/login", getLogin);
app.post("/loginform", loginLimiter, postLoginForm);

app.get("/loginVerification", getLoginVerification);
app.post("/loginVerification", verifyCodeLimiter, postLoginVerification);

app.get("/beheer", requireUserInUsers, getBeheer);
app.get("/logout", getLogout);

// -------------------- API key pages --------------------
app.get("/api-key", getApiKey);
app.post("/api-key/request", apiKeyRequestLimiter, postApiKeyRequest);

app.get("/api-key/verify", getApiKeyVerify);
app.post("/api-key/verify", apiKeyVerifyLimiter, postApiKeyVerify);

app.get("/api-key/success", getApiKeySuccess);

// -------------------- APIs --------------------
app.use("/api/public", publicApi);

// -------------------- Post --------------------
app.post("/newBatch", requireUserInUsers, async (req, res, next) => {
  try {
    const year = Number(req.body.batchYear);
    const month = Number(req.body.batchMonth); // 1..12

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return res.status(400).send("Invalid batchYear");
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).send("Invalid batchMonth");
    }

    // Batch date = first day of selected month at local midnight
    const batchDate = new Date(year, month - 1, 1);
    batchDate.setHours(0, 0, 0, 0);

    // Not in the future (compare to today 00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (batchDate > today) {
      return res.status(400).send("Batch month cannot be in the future");
    }

    // Parse body keys: inputTube_<nr>, inputValue_<nr>, nmp_<nr>
    const pointNumbers = new Set();
    for (const key of Object.keys(req.body)) {
      let m = key.match(/^inputTube_(\d+)$/);
      if (m) pointNumbers.add(Number(m[1]));
      m = key.match(/^inputValue_(\d+)$/);
      if (m) pointNumbers.add(Number(m[1]));
      m = key.match(/^nmp_(\d+)$/);
      if (m) pointNumbers.add(Number(m[1]));
    }

    if (pointNumbers.size === 0) {
      return res.status(400).send("No batch inputs found");
    }

    const db = await getDb();
    const collection = db.collection("Data");

    const ops = [];

    for (const pn of pointNumbers) {
      if (!Number.isFinite(pn)) continue;

      const tubeRaw = (req.body[`inputTube_${pn}`] ?? "").trim();
      const valueRaw = req.body[`inputValue_${pn}`];
      const nmp = req.body[`nmp_${pn}`] === "on" || req.body[`nmp_${pn}`] === true;

      let measurement;

      if (nmp) {
        measurement = { date: batchDate, noMeasurement: true };
      } else {
        const value = valueRaw === "" || valueRaw == null ? NaN : Number(valueRaw);
        if (!Number.isFinite(value)) {
          return res.status(400).send(`Invalid value for point ${pn}`);
        }
        if (!tubeRaw) {
          return res.status(400).send(`Missing tube id for point ${pn}`);
        }
        measurement = { date: batchDate, tube_id: tubeRaw, value };
      }

      // filter matches both numeric and string stored point_number (same as your other routes)
      const filter = {
        $or: [{ point_number: pn }, { point_number: String(pn) }],
      };

      // Replace existing measurement for this month if present, otherwise add.
      // Easiest + reliable: pull then push.
      ops.push({
        updateOne: {
          filter,
          update: {
            $pull: { measurements: { date: batchDate } },
          },
        },
      });

      ops.push({
        updateOne: {
          filter,
          update: {
            $push: { measurements: measurement },
          },
        },
      });
    }

    const result = await collection.bulkWrite(ops, { ordered: true });

    // terug naar beheer
    return res.redirect("/beheer");
  } catch (err) {
    console.error("POST /newBatch failed:", err);
    return next(err);
  }
});


function parseISODateToLocalMidnight(iso) {
  // iso: "YYYY-MM-DD"
  const [y, m, d] = (iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

app.post("/newpoint", requireUserInUsers, async (req, res, next) => {
  try {
    const location = (req.body.location ?? "").trim();
    const description = (req.body.description ?? "").trim();
    const city = (req.body.city ?? "").trim();

    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);

    const start_date_raw = (req.body.start_date ?? "").trim();
    const start_date = parseISODateToLocalMidnight(start_date_raw);

    // checkbox -> "on" als aangevinkt
    const active = req.body.active === "on" || req.body.active === true;

    if (!location) return res.status(400).send("Location is required");
    if (!city) return res.status(400).send("City is required");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).send("Invalid coordinates");
    }
    if (!start_date || Number.isNaN(start_date.getTime())) {
      return res.status(400).send("Invalid start_date");
    }

    // --- start_date rules ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start_date > today) {
      return res.status(400).send("Start date cannot be in the future");
    }

    if (start_date.getDate() !== 1) {
      return res.status(400).send("Start date must be the first day of the month");
    }

    const db = await getDb();
    const collection = db.collection("Data");

    // volgende point_number
    const maxAgg = await collection
      .aggregate([
        {
          $project: {
            pn: {
              $convert: {
                input: "$point_number",
                to: "int",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        { $group: { _id: null, maxPn: { $max: "$pn" } } },
      ])
      .toArray();

    const nextPointNumber = (maxAgg[0]?.maxPn ?? 0) + 1;

    await collection.insertOne({
      point_number: nextPointNumber,
      location,
      city,
      coordinates: { lat, lon },
      description,
      start_date,
      measurements: [],
      active,
    });

    return res.redirect("/beheer");
  } catch (err) {
    console.error("POST /newpoint failed:", err);
    return next(err);
  }
});

app.post("/editpoint", requireUserInUsers, async (req, res, next) => {
  try {
    const raw = req.query.point;
    const pointNumber = Number(raw);

    if (!Number.isFinite(pointNumber)) {
      return res.status(400).send("Invalid point number");
    }

    const location = (req.body.location ?? "").trim();
    const description = (req.body.description ?? "").trim();

    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).send("Invalid coordinates");
    }

    // Form arrays require: express.urlencoded({ extended: true })
    const measurementsRaw = Array.isArray(req.body.measurements) ? req.body.measurements : [];

    const cleanedMeasurements = measurementsRaw
      .map((m) => {
        const dt = m?.date ? new Date(m.date) : null;
        if (!dt || Number.isNaN(dt.getTime())) return null;

        // Checkbox komt binnen als "on" (string) als hij aangevinkt is
        const noMeasurement = m?.noMeasurement === "on" || m?.noMeasurement === true;

        const tube_id = (m?.tube_id ?? "").trim();

        const valueRaw = m?.value;
        const value = valueRaw === "" || valueRaw == null ? null : Number(valueRaw);

        if (noMeasurement) {
          // bij "no measurement" bewaren we expliciet die flag
          return { date: dt, noMeasurement: true };
        }

        // geen noMeasurement => value moet geldig zijn
        if (value === null || !Number.isFinite(value)) return null;

        return { date: dt, tube_id, value };
      })
      .filter(Boolean);

    const db = await getDb();
    const collection = db.collection("Data");

    // match zowel numeric als string opgeslagen point_number
    const filter = {
      $or: [{ point_number: pointNumber }, { point_number: String(pointNumber) }],
    };

    const result = await collection.updateOne(filter, {
      $set: {
        location,
        description,
        coordinates: { lat, lon },
        measurements: cleanedMeasurements,
      },
    });

    if (result.matchedCount === 0) {
      return res.status(404).send("Point not found");
    }

    return res.redirect("/beheer");
  } catch (err) {
    return next(err);
  }
});
app.post("/togglepoint", requireUserInUsers, async (req, res, next) => {
  try {
    const raw = req.query.point;
    const pointNumber = Number(raw);

    if (!Number.isFinite(pointNumber)) {
      return res.status(400).send("Invalid point number");
    }

    const db = await getDb();
    const collection = db.collection("Data");

    const filter = {
      $or: [
        { point_number: pointNumber },
        { point_number: String(pointNumber) },
      ],
    };

    const result = await collection.updateOne(
      filter,
      [
        {
          $set: {
            active: { $not: [{ $ifNull: ["$active", false] }] }
          }
        }
      ]
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Point not found");
    }

    return res.redirect("/beheer");
  } catch (err) {
    return next(err);
  }
});

app.post("/addUser", requireUserInUsers, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send("No user email provided");
    }

    const db = await getDb();
    const usersCollection = db.collection("Users");

    await usersCollection.insertOne({
      email: email,
      createdAt: new Date()
    });

    res.redirect("/beheer");
  } catch (err) {
    next(err);
  }
});


app.post("/DelUser", requireUserInUsers, async (req, res, next) => {
  try {
    const email = req.query.user;

    if (!email) {
      return res.status(400).send("No user email provided");
    }

    const db = await getDb();
    const usersCollection = db.collection("Users");

    await usersCollection.deleteOne({ email });

    res.redirect("/beheer");
  } catch (err) {
    next(err);
  }
});

// -------------------- downloads --------------------
app.get("/downloads/data.json", getDownloadJson);
app.get("/downloads/data.csv", getDownloadCsv);
app.get("/downloads/data.xlsx", getDownloadXlsx);

// -------------------- export / local start --------------------
module.exports = app;

if (process.env.VERCEL !== "1") {
  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running at http://localhost:3000");
  });
}
