// controllers/authController.js
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

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

    return res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// LOGIN (SESSION BASED)
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

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ STORE USER IN SESSION
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    };

    return res.json({
      message: "Login successful",
      user: req.session.user,
    });

  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// LOGOUT
// =========================
export const logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }

    res.clearCookie("connect.sid"); // session cookie

    return res.json({ message: "Logged out successfully" });
  });
};