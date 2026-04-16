import express from "express";
import {
  createCall,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketHistory,
  assignTicket,
  updateTicketStatus,
  autoAssignTicket,
  getCallsByStatus
} from "../controllers/callController.js";

import { requireOtpVerified } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

/* ==================== CREATE CALL ==================== */

/**
 * @swagger
 * /api/calls:
 *   post:
 *     summary: Create ATM call
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - atm_id
 *               - bank_name
 *               - location
 *               - issue_type
 *             properties:
 *               atm_id:
 *                 type: string
 *                 example: ATM_001
 *               bank_name:
 *                 type: string
 *                 example: GTBank
 *               location:
 *                 type: string
 *                 example: Lagos Island
 *               issue_type:
 *                 type: string
 *                 example: Cash dispenser error
 *               priority:
 *                 type: string
 *                 example: high
 *               assigned_to:
 *                 type: string
 *                 example: engineer_uuid_here
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post("/", requireOtpVerified, createCall);

/* ==================== STATUS FILTER ==================== */

/**
 * @swagger
 * /api/calls/status:
 *   get:
 *     summary: Get tickets grouped by status
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           example: open
 *     responses:
 *       200:
 *         description: Filtered tickets
 */
router.get("/status", requireOtpVerified, getCallsByStatus);

/* ==================== GET ALL ==================== */

/**
 * @swagger
 * /api/calls:
 *   get:
 *     summary: Get all tickets
 *     tags: [ATM Calls]
 */
router.get("/", requireOtpVerified, getTickets);

/* ==================== GET BY ID ==================== */

/**
 * @swagger
 * /api/calls/{ticketId}:
 *   get:
 *     summary: Get a single ticket
 *     tags: [ATM Calls]
 */
router.get("/:ticketId", requireOtpVerified, getTicketById);

/* ==================== UPDATE ==================== */

router.patch("/:ticketId", requireOtpVerified, updateTicket);

/* ==================== DELETE ==================== */

router.delete("/:ticketId", requireOtpVerified, requireAdmin(), deleteTicket);

/* ==================== ASSIGN ==================== */

router.patch(
  "/:ticketId/assign",
  requireOtpVerified,
  requireAdmin(true),
  assignTicket
);

/* ==================== STATUS UPDATE ==================== */

router.patch(
  "/:ticketId/status",
  requireOtpVerified,
  requireAdmin(true),
  updateTicketStatus
);

/* ==================== HISTORY ==================== */

router.get(
  "/:ticketId/history",
  requireOtpVerified,
  requireAdmin(),
  getTicketHistory
);

/* ==================== AUTO ASSIGN ==================== */

router.patch(
  "/:ticketId/auto-assign",
  requireOtpVerified,
  requireAdmin(true),
  autoAssignTicket
);

export default router;