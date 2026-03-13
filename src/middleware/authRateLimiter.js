import rateLimit from "express-rate-limit";

// Global API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: {
    error: "Too many API requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Login limiter
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many login attempts. Try again later."
  }
});

// OTP limiter
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many OTP attempts."
  }
});