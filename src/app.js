import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import cron from "node-cron";
import { generateReportsCron } from "./controllers/reportController.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import engineerRoutes from "./routes/engineerRoutes.js";
import { otpLimiter,apiLimiter } from "./middleware/authRateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";


const PgSession = pgSession(session);
const app = express();

// =========================
// ✅ CORS Config
// =========================
const allowedOrigins = [
  "http://localhost:5173", // React dev
  "http://127.0.0.1:3000", // alternative localhost
  process.env.FRONTEND_URL, // production
];

app.use(cors({
  origin: function(origin, callback){
    // Allow requests with no origin (like Postman)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // allow cookies to be sent
}));

// =========================
// Body parser
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Session
// =========================
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      ttl: 2 * 60 * 60, // 2 hours
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      sameSite: "lax", // "none" if using HTTPS cross-domain
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    },
  })
);

// =========================
// Routes
// =========================
app.get("/", (req, res) => {
  res.json({ message: "ATM Calls Management API running" });
});

app.use("/api/auth", authRoutes);
app.use("/atm_calls/tickets", callRoutes);
app.use("/api/reports", reportRoutes);
app.use("/atm_calls", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/engineers", engineerRoutes);
app.use("/api", otpLimiter);
app.use("/api", apiLimiter);
app.use(errorHandler);
// =========================
// Cron: Daily reports
// =========================
cron.schedule("5 0 * * *", async () => {
  console.log("🔔 Running automated reports...");
  try {
    await generateReportsCron();
    console.log("✅ Automated reports completed successfully");
  } catch (err) {
    console.error("❌ Error generating automated reports:", err);
  }
});

export default app;