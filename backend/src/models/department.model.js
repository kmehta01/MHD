const db = require("../config/db");

const findActive = async () => {
  const [departments] = await db.query(
    `SELECT id, name, slug
     FROM departments
     WHERE is_active = 1
     ORDER BY name ASC`,
  );

  return departments;
};

module.exports = {
  findActive,
};
