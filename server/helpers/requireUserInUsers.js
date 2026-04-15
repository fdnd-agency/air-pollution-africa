const { ObjectId } = require("mongodb");
const getDb = require("../db/getDb");

async function requireUserInUsers(req, res, next) {
  try {
    if (!req.session?.userId) return res.redirect("/login");

    if (!ObjectId.isValid(req.session.userId)) {
      req.session.destroy(() => {});
      return res.redirect("/login");
    }

    const db = await getDb();
    const users = db.collection("Users");

    const user = await users.findOne({ _id: new ObjectId(req.session.userId) });
    if (!user || !user.email) {
      req.session.destroy(() => {});
      return res.redirect("/login");
    }

    req.user = { id: user._id.toString(), email: user.email };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireUserInUsers;
