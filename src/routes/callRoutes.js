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


/* ==================== TICKET CRUD ==================== */

/**
 * /**
 * @swagger
 * /api/calls:
 *   post:
 *     summary: Create ATM call
 *     tags: [ATM Calls]
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
 *                 example: engineer_id_here
 */
router.post("/", requireOtpVerified, createCall);


/**
 * @swagger
 * /atm_calls/tickets/status:
 *   get:
 *     summary: Get tickets grouped by status
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tickets grouped by status
 */
router.get("/status", requireOtpVerified, getCallsByStatus);


/**
 * @swagger
 * /atm_calls/tickets:
 *   get:
 *     summary: Get all tickets
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.get("/", requireOtpVerified, getTickets);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}:
 *   get:
 *     summary: Get a single ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket details
 */
router.get("/:ticketId", requireOtpVerified, getTicketById);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}:
 *   patch:
 *     summary: Update ticket details
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.patch("/:ticketId", requireOtpVerified, updateTicket);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}:
 *   delete:
 *     summary: Delete a ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.delete("/:ticketId", requireOtpVerified, requireAdmin(), deleteTicket);



/* ==================== ADMIN ACTIONS ==================== */

/**
 * @swagger
 * /atm_calls/tickets/{ticketId}/assign:
 *   patch:
 *     summary: Assign ticket to engineer
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.patch("/:ticketId/assign", requireOtpVerified, requireAdmin(true), assignTicket);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}/status:
 *   patch:
 *     summary: Update ticket status
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.patch("/:ticketId/status", requireOtpVerified, requireAdmin(true), updateTicketStatus);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}/history:
 *   get:
 *     summary: Get ticket history
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.get("/:ticketId/history", requireOtpVerified, requireAdmin(), getTicketHistory);


/**
 * @swagger
 * /atm_calls/tickets/{ticketId}/auto-assign:
 *   patch:
 *     summary: Auto assign ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 */
router.patch("/:ticketId/auto-assign", requireOtpVerified, requireAdmin(true), autoAssignTicket);


export default router;