const db = require("../config/db");

const testConnection = async () => {
  const [rows] = await db.query("SELECT 1 + 1 AS result");

  return rows;
};

module.exports = {
  testConnection,
};
