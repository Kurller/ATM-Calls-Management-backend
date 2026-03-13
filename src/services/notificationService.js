import { pool } from "../config/db.js";
import { sendEmail } from "./emailService.js";

export const notifySupervisors = async (message) => {
  try {
    const { rows } = await pool.query(
      `SELECT email FROM users WHERE role='admin'`
    );

    for (const supervisor of rows) {
      await sendEmail(supervisor.email, "ATM Ticket Notification", message);
    }
  } catch (err) {
    console.error("Supervisor notification error:", err);
  }
};