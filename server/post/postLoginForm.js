const getDb = require("../db/getDb");
const generateCode = require("../helpers/generateCode");
const getResendClient = require("../services/resend");

module.exports = async function postLoginForm(req, res, next) {
  try {
    const db = await getDb();
    const { email } = req.body;

    if (!email) {
      return res.render("pages/login", { error: "Voer een e-mailadres in." });
    }

    const usersCollection = db.collection("Users");
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.render("pages/login", {
        error: "We have sent you a login link and code.",
      });
    }

    const { plain, hash } = await generateCode();
    const expiresAt = new Date(Date.now() + 100 * 60 * 1000);

    const loginCodesCollection = db.collection("LoginCodes");
    await loginCodesCollection.deleteMany({ email: user.email });
    await loginCodesCollection.insertOne({
      email: user.email,
      code: hash,
      expiresAt,
      userId: user._id.toString(),
      used: false,
      createdAt: new Date(),
    });

    req.session.pendingEmail = user.email;

    const resend = getResendClient();
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: "Je login code",
      html: `
        <p>Je login code is: <strong>${plain}</strong></p>
        <p>Deze code is 10 minuten geldig.</p>
      `,
    });

    res.redirect("/loginVerification");
  } catch (err) {
    console.error(err);
    next(err);
  }
};
