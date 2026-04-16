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
 *   get:
 *     summary: Get all ATM tickets
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: open
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           example: high
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Ticket created succesfully
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
 *     summary: Get all ATM tickets
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: open
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           example: high
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.get("/", requireOtpVerified, getTickets);

/* ==================== GET BY ID ==================== */

/**
 * @swagger
 * /api/calls/{ticketId}:
 *   get:
 *     summary: Get a single ticket
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           example: 123
 *     responses:
 *       200:
 *         description: Ticket details
 */
router.get("/:ticketId", requireOtpVerified, getTicketById);

/* ==================== UPDATE ==================== */
/**
 * @swagger
 * /api/calls/{ticketId}:
 *   patch:
 *     summary: Update ticket
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: resolved
 *               priority:
 *                 type: string
 *                 example: high
 *     responses:
 *       200:
 *         description: Ticket updated
 */
router.patch("/:ticketId", requireOtpVerified, updateTicket);

/* ==================== DELETE ==================== */
/**
 * @swagger
 * /api/calls/{ticketId}:
 *   delete:
 *     summary: Delete ticket
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket deleted
 */
router.delete("/:ticketId", requireOtpVerified, requireAdmin(), deleteTicket);

/* ==================== ASSIGN ==================== */
/**
 * @swagger
 * /api/calls/{ticketId}/assign:
 *   patch:
 *     summary: Assign ticket to engineer
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - engineer_id
 *             properties:
 *               engineer_id:
 *                 type: string
 *                 example: c6d91434-4f75-40db-824d-63a020982caa
 *     responses:
 *       200:
 *         description: Engineer assigned
 */
router.patch(
  "/:ticketId/assign",
  requireOtpVerified,
  requireAdmin(true),
  assignTicket
);

/* ==================== STATUS UPDATE ==================== */
/**
 * @swagger
 * /api/calls/status:
 *   get:
 *     summary: Get tickets by status
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
 */router.patch(
  "/:ticketId/status",
  requireOtpVerified,
  requireAdmin(true),
  updateTicketStatus
);

/* ==================== HISTORY ==================== */
/**
 * @swagger
 * /api/calls/{ticketId}/history:
 *   get:
 *     summary: Get ticket history
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         example: c6d91434-4f75-40db-824d-63a020982caa
 *     responses:
 *       200:
 *         description: Ticket history retrieved successfully
 */
router.get(
  "/:ticketId/history",
  requireOtpVerified,
  requireAdmin(),
  getTicketHistory
);

/* ==================== AUTO ASSIGN ==================== */
/**
 * @swagger
 * /api/calls/{ticketId}/auto-assign:
 *   patch:
 *     summary: Auto assign ticket to least busy engineer
 *     tags: [ATM Calls]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         example: c6d91434-4f75-40db-824d-63a020982caa
 *     responses:
 *       200:
 *         description: Ticket auto-assigned successfully
 *       400:
 *         description: Ticket already assigned or no engineers available
 *       404:
 *         description: Ticket not found
 */
router.patch(
  "/:ticketId/auto-assign",
  requireOtpVerified,
  requireAdmin(true),
  autoAssignTicket
);

export default router;