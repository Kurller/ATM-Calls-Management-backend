// src/controllers/authController.js
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { sendLoginOTP } from "../services/otpService.js";

/* -------------------------------
   Request OTP
---------------------------------*/
export const requestLogin = async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendLoginOTP(userRes.rows[0]);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Error in requestLogin:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------
   Verify OTP
---------------------------------*/
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    const otpRes = await pool.query(
      `SELECT * FROM email_otps
       WHERE user_id = $1 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (otpRes.rowCount === 0) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const otpRecord = otpRes.rows[0];

    if (otpRecord.expires_at < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Mark OTP as used
    await pool.query("UPDATE email_otps SET used = true WHERE id = $1", [
      otpRecord.id,
    ]);

    // ✅ Create session for OTP-verified user
    req.session.user = {
      id: user.id,
      role: user.role,
      otpVerified: true,
      otpExpiresAt: otpRecord.expires_at,
    };

    // Save session and respond
    req.session.save(() => {
      res.json({ message: "OTP verified successfully" });
    });
  } catch (err) {
    console.error("Error in verifyOTP:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};