async function ensureApiIndexes(db) {
  const apiCol = db.collection("API");

  await apiCol.createIndex({ emailLower: 1 }, { unique: true, name: "uniq_emailLower" });

  await apiCol.createIndex(
    { apiKey: 1 },
    {
      unique: true,
      name: "uniq_apiKey",
      partialFilterExpression: { apiKey: { $type: "string" } },
    }
  );

  await apiCol.createIndex({ lastCallAt: 1 }, { name: "idx_lastCallAt" });
}

module.exports = ensureApiIndexes;
