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

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    // ✅ SAFE: only check if column exists
    if (user.is_active !== undefined && user.is_active === false) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    await sendLoginOTP(user);

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

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    // 🔥 FIX: use EMAIL instead of user_id
    const otpRes = await pool.query(
      `SELECT * FROM email_otps
       WHERE email = $1 AND used = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (otpRes.rowCount === 0) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const otpRecord = otpRes.rows[0];

    // Expiry check
    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // ✅ mark OTP used
    await pool.query(
      "UPDATE email_otps SET used = true WHERE id = $1",
      [otpRecord.id]
    );

    // ✅ session login
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role || "user",
      otpVerified: true,
    };

    req.session.save(() => {
      res.json({
        message: "OTP verified successfully",
        user: req.session.user,
      });
    });

  } catch (err) {
    console.error("Error in verifyOTP:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};