const bcrypt = require("bcryptjs");
const getDb = require("../db/getDb");
const generateApiKey = require("../helpers/generateApiKey");
const getResendClient = require("../services/resend");

module.exports = async function postApiKeyVerify(req, res, next) {
  try {
    const emailLower = req.session.pendingApiKeyEmail;
    if (!emailLower) return res.redirect("/api-key");

    const code = String(req.body.code || "").trim();
    if (!code) return res.render("pages/apiKeyVerify", { error: "Voer je verificatiecode in." });

    const db = await getDb();
    const apiCol = db.collection("API");

    const record = await apiCol.findOne({ emailLower });

    if (!record || !record.verify || !record.verify.expiresAt || record.verify.expiresAt < new Date()) {
      return res.render("pages/apiKeyVerify", { error: "Ongeldige of verlopen code." });
    }

    // record.verify.code moet de bcrypt-hash zijn
    const ok = await bcrypt.compare(code, record.verify.code);
    if (!ok) {
      return res.render("pages/apiKeyVerify", { error: "Ongeldige of verlopen code." });
    }

    const apiKey = generateApiKey();
    const now = new Date();

    await apiCol.updateOne(
      { _id: record._id },
      { $set: { apiKey, verified: true, createdAt: now }, $unset: { verify: "" } }
    );

    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: emailLower,
      subject: "Je API key",
      html: `
        <p>Hier is je API key:</p>
        <p><strong>${apiKey}</strong></p>
        <p>Bewaar deze key goed. Je hebt deze nodig voor alle API calls.</p>
      `,
    });

    delete req.session.pendingApiKeyEmail;
    req.session.apiKeyToShow = apiKey;

    return res.redirect("/api-key/success");
  } catch (err) {
    console.error(err);
    next(err);
  }
};
