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


// =========================
// Swagger Config
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        url: process.env.BASE_URL || "http://localhost:5000",
      },
    ],
  },

  apis: [path.join(__dirname, "./routes/*.js")],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);


// =========================
// CORS (FIXED)
// =========================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",

  "http://127.0.0.1:5000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// =========================
// ✅ FIX: SAFE PRE-FLIGHT HANDLING (NO "*")
// =========================
app.options(/.*/, cors());


// =========================
// Swagger (FIXED)
// =========================
app.use(
  "/api-docs",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      withCredentials: true,
    },
  })
);


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


// =========================
// Routes
// =========================
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


// =========================
// Error Handler
// =========================
app.use(errorHandler);


// =========================
// Cron
// =========================
cron.schedule("5 0 * * *", async () => {
  console.log("🔔 Running automated reports...");

  try {
    await generateReportsCron();
    console.log("✅ Reports completed successfully");
  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});


// =========================
// DB Health Check
// =========================
pool.query("SELECT 1")
  .then(() => console.log("🟢 Database connected"))
  .catch((err) => console.error("❌ Database failed:", err.message));

export default app;