const getDb = require("../db/getDb");
const getResendClient = require("../services/resend");

async function requireApiKeyStrict(req, res, next) {
  try {
    const apiKey =
      String(req.headers["x-api-key"] || "").trim() ||
      String(req.query.apiKey || "").trim();

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required. Provide it via the 'x-api-key' header.",
      });
    }

    const db = await getDb();
    const apiCol = db.collection("API");

    const record = await apiCol.findOne({ apiKey });

    if (!record || record.verified !== true) {
      return res.status(403).json({ error: "Invalid or unverified API key." });
    }

    // 1 jaar inactiviteit
    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    if (record.lastCallAt && now - new Date(record.lastCallAt) > oneYearMs) {
      try {
        const resend = getResendClient();
        await resend.emails.send({
          from: process.env.FROM_EMAIL,
          to: record.emailLower,
          subject: "Je API key is verlopen – vraag een nieuwe aan",
          html: `
            <p>Je API key is verlopen omdat er langer dan 1 jaar geen API call is gedaan.</p>
            <p>Vraag een nieuwe API key aan via:</p>
            <p><strong>${process.env.BASE_URL || ""}/api-key</strong></p>
          `,
        });
      } catch (mailErr) {
        console.error("Failed to send expiry email:", mailErr);
      }

      await apiCol.deleteOne({ _id: record._id });

      return res.status(403).json({
        error: "API key expired due to inactivity. A new key is required.",
      });
    }

    // per-key rate limiting (20/min, 250/day)
    const minuteWindowMs = 60 * 1000;
    const dayWindowMs = 24 * 60 * 60 * 1000;

    let rate = record.rate || {};

    if (!rate.minute || !rate.minute.windowStart || now - new Date(rate.minute.windowStart) >= minuteWindowMs) {
      rate.minute = { windowStart: now, count: 1 };
    } else {
      rate.minute.count += 1;
      if (rate.minute.count > 20) {
        return res.status(429).json({ error: "Rate limit exceeded (20 requests per minute)." });
      }
    }

    if (!rate.day || !rate.day.windowStart || now - new Date(rate.day.windowStart) >= dayWindowMs) {
      rate.day = { windowStart: now, count: 1 };
    } else {
      rate.day.count += 1;
      if (rate.day.count > 250) {
        return res.status(429).json({ error: "Rate limit exceeded (250 requests per day)." });
      }
    }

    const lastCall = {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      query: req.query || {},
      userAgent: req.headers["user-agent"] || "",
    };

    await apiCol.updateOne(
      { _id: record._id },
      {
        $set: { rate, lastCallAt: now, lastCall },
        $inc: { totalCalls: 1 },
      }
    );

    req.apiClient = {
      _id: record._id,
      emailLower: record.emailLower,
      apiKey: record.apiKey,
      totalCalls: (record.totalCalls || 0) + 1,
    };


    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireApiKeyStrict;
