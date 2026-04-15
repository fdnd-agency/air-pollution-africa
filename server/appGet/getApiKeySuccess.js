module.exports = function getApiKeySuccess(req, res) {
  const apiKey = req.session.apiKeyToShow;
  if (!apiKey) return res.redirect("/api-key");
  delete req.session.apiKeyToShow;
  res.render("pages/apiKeySuccess", { apiKey });
};
