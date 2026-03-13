import express from "express";
import { requestLogin, verifyOTP } from "../controllers/authController.js";
import { loginLimiter, otpLimiter } from "../middleware/authRateLimiter.js";

const router = express.Router();

// Login & OTP routes with rate limiting
router.post("/request-login", loginLimiter, requestLogin);
router.post("/verify-otp", otpLimiter, verifyOTP);

// Get current authenticated user
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: req.session.user,
  });
});

// Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

export default router;