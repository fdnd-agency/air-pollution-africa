module.exports = function getApiKeyVerify(req, res) {
  if (!req.session.pendingApiKeyEmail) return res.redirect("/api-key");
  res.render("pages/apiKeyVerify", { error: null });
};
