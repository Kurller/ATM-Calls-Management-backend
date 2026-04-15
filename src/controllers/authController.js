// controllers/authController.js
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// =========================
// REGISTER
// =========================
export const register = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    email = email.toLowerCase().trim();
    password = String(password);

    const userExist = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userExist.rows.length) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password) 
       VALUES ($1, $2) 
       RETURNING id, email, role`,
      [email, hashedPassword]
    );

    const user = result.rows[0];

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// LOGIN
// =========================
export const login = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    email = email.toLowerCase().trim();
    password = String(password);

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 🔥 SAFE: only check if column exists
    if (user.is_active !== undefined && user.is_active === false) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role || "user",
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// REFRESH TOKEN
// =========================
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    const payload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.json({ accessToken });
  } catch (err) {
    console.error("refresh token error:", err.message);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// =========================
// LOGOUT
// =========================
export const logout = async (req, res) => {
  return res.json({ message: "Logged out successfully" });
};