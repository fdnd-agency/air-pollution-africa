module.exports = function getLoginVerification(req, res) {
  if (!req.session.pendingEmail) return res.redirect("/login");
  res.render("pages/loginVerification", { error: null });
};
