import express from "express";
import { login, verifyOTP } from "../controllers/authController.js";
import { loginLimiter, otpLimiter } from "../middleware/authRateLimiter.js";

const router = express.Router();


// =========================
// Auth Routes
// =========================

/**
 * @swagger
 * /api/auth/request-login:
 *   post:
 *     summary: Request login OTP
 *     tags: [Auth]
 *     description: Sends OTP to user's email or phone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       429:
 *         description: Too many requests
 */
router.post("/request-login", loginLimiter, login);


/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login
 *     tags: [Auth]
 *     description: Verifies OTP and creates session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid OTP
 */
router.post("/verify-otp", otpLimiter, verifyOTP);


// =========================
// Get Current User
// =========================

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User is authenticated
 *       401:
 *         description: Not authenticated
 */
router.get("/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      authenticated: false,
    });
  }

  res.json({
    success: true,
    authenticated: true,
    user: req.session.user,
  });
});


// =========================
// Logout
// =========================

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({ message: "No active session" });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }

    res.clearCookie("connect.sid");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

export default router;