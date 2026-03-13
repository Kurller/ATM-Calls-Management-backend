import { pool } from "../config/db.js";

export const getEngineers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, location FROM engineers"
    );
    res.json({ engineers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch engineers" });
  }
};