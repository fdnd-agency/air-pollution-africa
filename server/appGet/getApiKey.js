module.exports = function getApiKey(req, res) {
  res.render("pages/apiKeyRequest", { error: null });
};
