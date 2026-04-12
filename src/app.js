import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import cron from "node-cron";

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import path from "path";
import { fileURLToPath } from "url";

import { pool } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import engineerRoutes from "./routes/engineerRoutes.js";

import { generateReportsCron } from "./controllers/reportController.js";
import { otpLimiter, apiLimiter } from "./middleware/authRateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PgSession = pgSession(session);
const app = express();

/* =========================
   🔥 CRITICAL FIX FOR RENDER
========================= */
app.set("trust proxy", 1);

/* =========================
   PATH FIX
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   SWAGGER CONFIG
========================= */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ATM Calls Management API",
      version: "1.0.0",
      description: "API documentation for ATM Calls Management System",
    },
    servers: [
      {
        url: process.env.BASE_URL || "https://atm-calls-management-backend-1.onrender.com",
      },
    ],
  },
  apis: [path.join(__dirname, "./routes/*.js")],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/* =========================
   CORS CONFIG (FIXED)
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // allow Swagger / Postman / curl safely
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   PRE-FLIGHT FIX (EXPRESS 5 SAFE)
========================= */
app.options(/.*/, cors());

/* =========================
   SWAGGER ROUTE
========================= */
app.use(
  "/api-docs",
  cors(),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   SESSION
========================= */
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      ttl: 2 * 60 * 60,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

/* =========================
   ROUTES
   (rate limiter ONLY on auth)
========================= */
app.get("/", (req, res) => {
  res.json({
    message: "ATM Calls Management API running",
    docs: "/api-docs",
  });
});

app.use("/api/auth", otpLimiter, apiLimiter, authRoutes);
app.use("/atm_calls/tickets", callRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/engineers", engineerRoutes);

/* =========================
   ERROR HANDLER (LAST)
========================= */
app.use(errorHandler);

/* =========================
   CRON JOB
========================= */
cron.schedule("5 0 * * *", async () => {
  console.log("🔔 Running automated reports...");

  try {
    await generateReportsCron();
    console.log("✅ Reports completed successfully");
  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});

/* =========================
   DB HEALTH CHECK
========================= */
pool.query("SELECT 1")
  .then(() => console.log("🟢 Database connected"))
  .catch((err) => console.error("❌ Database failed:", err.message));

export default app;