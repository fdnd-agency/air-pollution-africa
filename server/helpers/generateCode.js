const bcrypt = require("bcryptjs");

async function generateCode() {
  const plain = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await hashData(plain);
  return { plain, hash };
}

async function hashData(data) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(data, salt);
}

module.exports = generateCode;
