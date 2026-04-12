import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

console.log("DATABASE_URL:", process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // ✅ REQUIRED for CockroachDB
  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// =========================
// Events
// =========================
pool.on("connect", () => {
  console.log("✅ Connected to CockroachDB");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
});