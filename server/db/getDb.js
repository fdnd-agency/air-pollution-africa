const { MongoClient } = require("mongodb");
const ensureApiIndexes = require("./ensureApiIndexes");

let db = null;
let dbPromise = null;

async function getDb() {
  if (db) return db;
  if (dbPromise) return dbPromise;

  const uri = (process.env.MONGODB_URI || "").trim();
  const dbName = (process.env.MONGODB_DB_NAME || "").trim();

  if (!uri || !dbName) {
    throw new Error("MONGODB_URI or MONGODB_DB_NAME missing in environment.");
  }

  const client = new MongoClient(uri);

  dbPromise = client
    .connect()
    .then(async (client) => {
      db = client.db(dbName);
      await ensureApiIndexes(db);
      return db;
    })
    .catch((err) => {
      dbPromise = null;
      throw err;
    });

  return dbPromise;
}

module.exports = getDb;
