import express from "express";
import { generateReportsCron, getFullReport,getLatestReport } from "../controllers/reportController.js";
import { requireOtpVerified } from "../middleware/authMiddleware.js";
import {
  getTrendChart,
  getATMChart,
  getEngineerChart,
  getFaultChart,generateCustomReport
} from "../controllers/reportController.js";

const router = express.Router();
router.get("/charts/trend", getTrendChart);
router.get("/charts/atm/:report_id", getATMChart);
router.get("/charts/engineer/:report_id", getEngineerChart);
router.get("/charts/fault/:report_id", getFaultChart);
router.post("/generate-custom", generateCustomReport);

// Endpoint to manually generate all reports
router.post("/generate-reports", generateReportsCron);

// Test endpoint to run cron manually
router.get("/test-cron", async (req, res) => {
  try {
    await generateReportsCron();
    res.json({ message: "Cron report generation ran successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run cron report" });
  }
});

// GET full report by report_id
router.get("/full/:report_id",requireOtpVerified, getFullReport);
router.get("/latest", getLatestReport);
export default router;