const bcrypt = require("bcryptjs");
const getDb = require("../db/getDb");

module.exports = async function postLoginVerification(req, res, next) {
  try {
    const rawCode = req.body.code;
    const email = req.session.pendingEmail;

    if (!email) return res.redirect("/login");

    const code = String(rawCode || "").trim();

    const db = await getDb();
    const loginCodesCollection = db.collection("LoginCodes");

    // Haal de nieuwste / actieve code op voor dit emailadres
    const record = await loginCodesCollection.findOne(
      { email, used: false },
      { sort: { createdAt: -1 } } // als je createdAt opslaat
    );

    if (!record || !record.expiresAt || record.expiresAt < new Date()) {
      return res.render("pages/loginVerification", { error: "Ongeldige of verlopen code." });
    }

    // bcrypt-vergelijking (record.code moet dan de hash zijn)
    const ok = await bcrypt.compare(code, record.code);
    if (!ok) {
      return res.render("pages/loginVerification", { error: "Ongeldige of verlopen code." });
    }

    await loginCodesCollection.updateOne(
      { _id: record._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    delete req.session.pendingEmail;
    req.session.userId = record.userId;

    res.redirect("/beheer");
  } catch (err) {
    console.error(err);
    next(err);
  }
};
