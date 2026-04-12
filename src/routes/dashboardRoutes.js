import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();


// =========================
// Dashboard Route
// =========================

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     description: Returns summary stats for ATM operations (tickets, status, engineers, etc.)
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTickets:
 *                   type: integer
 *                 openTickets:
 *                   type: integer
 *                 resolvedTickets:
 *                   type: integer
 *                 assignedTickets:
 *                   type: integer
 */
router.get("/", requireOtpVerified, getDashboardStats);

export default router;