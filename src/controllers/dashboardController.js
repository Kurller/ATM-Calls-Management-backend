import { pool } from "../config/db.js";

export const getDashboardStats = async (req, res) => {
  try {

    const total = await pool.query(
      `SELECT COUNT(*) FROM atm_calls`
    );

    const open = await pool.query(
      `SELECT COUNT(*) FROM atm_calls WHERE status = 'open'`
    );

    const progress = await pool.query(
      `SELECT COUNT(*) FROM atm_calls WHERE status = 'in-progress'`
    );

    const resolved = await pool.query(
      `SELECT COUNT(*) FROM atm_calls WHERE status = 'resolved'`
    );

    const highPriority = await pool.query(
      `SELECT COUNT(*) FROM atm_calls WHERE priority = 'high'`
    );

    res.json({
      total_calls: total.rows[0].count,
      open_calls: open.rows[0].count,
      in_progress: progress.rows[0].count,
      resolved_calls: resolved.rows[0].count,
      high_priority: highPriority.rows[0].count
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};