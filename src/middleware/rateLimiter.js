import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../config/redis.js";

// Global API limiter (shared across servers)
export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),

  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,

  message: {
    error: "Too many API requests. Try again later."
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// Login limiter
export const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),

  windowMs: 15 * 60 * 1000,
  max: 5,

  message: {
    error: "Too many login attempts."
  }
});

// OTP limiter
export const otpLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),

  windowMs: 10 * 60 * 1000,
  max: 10,

  message: {
    error: "Too many OTP attempts."
  }
});