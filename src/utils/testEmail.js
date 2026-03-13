import dotenv from "dotenv";
dotenv.config();

import { transporter } from "../config/email.js";

const sendTestEmail = async () => {
  await transporter.sendMail({
    from: `"ATM Support" <${process.env.EMAIL_USER}>`,
    to: "kolaquadry@gmail.com",
    subject: "Email Test Successful",
    text: "Your email setup is working!",
  });

  console.log("✅ Test email sent");
};

sendTestEmail();