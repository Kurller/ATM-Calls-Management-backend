import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireOtpVerified, getDashboardStats);

export default router;