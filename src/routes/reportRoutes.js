import express from "express";

import {
  generateReportsCron,
  getFullReport,
  getLatestReport,
  getTrendChart,
  getATMChart,
  getEngineerChart,
  getFaultChart,
  generateCustomReport,
} from "../controllers/reportController.js";

import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();


// =========================
// CHART ROUTES
// =========================

/**
 * @swagger
 * /api/reports/charts/trend:
 *   get:
 *     summary: Get trend chart data
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 */
router.get("/charts/trend", requireOtpVerified, getTrendChart);


/**
 * @swagger
 * /api/reports/charts/atm/{report_id}:
 *   get:
 *     summary: Get ATM chart data
 *     tags: [Reports]
 */
router.get("/charts/atm/:report_id", requireOtpVerified, getATMChart);


/**
 * @swagger
 * /api/reports/charts/engineer/{report_id}:
 *   get:
 *     summary: Get engineer chart data
 *     tags: [Reports]
 */
router.get("/charts/engineer/:report_id", requireOtpVerified, getEngineerChart);


/**
 * @swagger
 * /api/reports/charts/fault/{report_id}:
 *   get:
 *     summary: Get fault chart data
 *     tags: [Reports]
 */
router.get("/charts/fault/:report_id", requireOtpVerified, getFaultChart);


// =========================
// REPORT GENERATION
// =========================

/**
 * @swagger
 * /api/reports/generate-custom:
 *   post:
 *     summary: Generate custom report
 *     tags: [Reports]
 */
router.post("/generate-custom", requireOtpVerified, generateCustomReport);


/**
 * @swagger
 * /api/reports/generate-reports:
 *   post:
 *     summary: Manually generate all reports (admin/cron trigger)
 *     tags: [Reports]
 */
router.post("/generate-reports", requireOtpVerified, async (req, res) => {
  try {
    await generateReportsCron();
    res.json({ message: "Reports generated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate reports" });
  }
});


// =========================
// REPORT FETCHING
// =========================

/**
 * @swagger
 * /api/reports/full/{report_id}:
 *   get:
 *     summary: Get full report by ID
 *     tags: [Reports]
 */
router.get("/full/:report_id", requireOtpVerified, getFullReport);


/**
 * @swagger
 * /api/reports/latest:
 *   get:
 *     summary: Get latest report
 *     tags: [Reports]
 */
router.get("/latest", requireOtpVerified, getLatestReport);


export default router;