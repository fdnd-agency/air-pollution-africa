const { Resend } = require("resend");

function getResendClient() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) throw new Error("RESEND_API_KEY missing in environment.");
  return new Resend(key);
}

module.exports = getResendClient;
