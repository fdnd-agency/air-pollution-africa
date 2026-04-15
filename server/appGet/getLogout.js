module.exports = function getLogout(req, res) {
  req.session.destroy(() => res.redirect("/login"));
};
