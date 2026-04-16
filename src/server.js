import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { pool } from "./config/db.js";

const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    // 🔥 safer DB check with timeout handling
    const result = await pool.query("SELECT 1");

    if (result) {
      console.log("🟢 Database connection verified");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    // 🔥 IMPORTANT: don't silently crash on transient Railway issues
    // Instead retry after delay (helps ECONNRESET cases)
    console.log("⏳ Retrying DB connection in 5 seconds...");

    setTimeout(startServer, 5000);
  }
};

startServer();