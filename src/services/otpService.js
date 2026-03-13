import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateOTP } from "../utils/generateOTP.js";
import { transporter } from "../config/email.js";

export const sendLoginOTP = async (user) => {
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  await pool.query(
    `INSERT INTO email_otps (user_id, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, otpHash, expiresAt]
  );

  await transporter.sendMail({
    from: `"ATM Support" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your ATM Support Login Code",
    text: `Your login code is ${otp}. It expires in 5 minutes.`,
  });
};