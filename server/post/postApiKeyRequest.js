const getDb = require("../db/getDb");
const generateCode = require("../helpers/generateCode");
const getResendClient = require("../services/resend");

module.exports = async function postApiKeyRequest(req, res, next) {
  try {
    const db = await getDb();
    const apiCol = db.collection("API");

    const emailRaw = String(req.body.email || "").trim();
    if (!emailRaw) return res.render("pages/apiKeyRequest", { error: "Voer een e-mailadres in." });

    const emailLower = emailRaw.toLowerCase();

    const { plain, hash } = await generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await apiCol.updateOne(
      { emailLower },
      {
        $set: {
          email: emailRaw,
          emailLower,
          "verify.code": hash,
          "verify.expiresAt": expiresAt,
        },
        $setOnInsert: {
          verified: false,
          createdAt: new Date(),
          rate: {
            minute: { windowStart: new Date(0), count: 0 },
            day: { windowStart: new Date(0), count: 0 },
          },
        },
      },
      { upsert: true }
    );

    req.session.pendingApiKeyEmail = emailLower;

    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: emailLower,
      subject: "Bevestig je email voor je API key",
      html: `
        <p>Je verificatiecode is: <strong>${plain}</strong></p>
        <p>Deze code is 10 minuten geldig.</p>
        <p>Vul deze code in om je API key te ontvangen.</p>
      `,
    });

    return res.redirect("/api-key/verify");
  } catch (err) {
    console.error(err);
    next(err);
  }
};
