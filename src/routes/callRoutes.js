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

/**
 * @swagger
 * /api/calls:
 *   post:
 *     summary: Create ATM call
 *     tags: [ATM Calls]
 */
router.post("/", requireOtpVerified, createCall);

/**
 * @swagger
 * /api/calls/status:
 *   get:
 *     summary: Get tickets by status
 */
router.get("/status", requireOtpVerified, getCallsByStatus);

/**
 * @swagger
 * /api/calls:
 *   get:
 *     summary: Get all tickets
 */
router.get("/", requireOtpVerified, getTickets);

/**
 * @swagger
 * /api/calls/{ticketId}:
 *   get:
 */
router.get("/:ticketId", requireOtpVerified, getTicketById);

/**
 * @swagger
 * /api/calls/{ticketId}:
 *   patch:
 */
router.patch("/:ticketId", requireOtpVerified, updateTicket);

/**
 * @swagger
 * /api/calls/{ticketId}:
 *   delete:
 */
router.delete("/:ticketId", requireOtpVerified, requireAdmin, deleteTicket);

/**
 * @swagger
 * /api/calls/{ticketId}/assign:
 *   patch:
 */
router.patch("/:ticketId/assign", requireOtpVerified, requireAdmin, assignTicket);

/**
 * @swagger
 * /api/calls/{ticketId}/status:
 *   patch:
 */
router.patch("/:ticketId/status", requireOtpVerified, requireAdmin, updateTicketStatus);

/**
 * @swagger
 * /api/calls/{ticketId}/history:
 *   get:
 */
router.get("/:ticketId/history", requireOtpVerified, requireAdmin, getTicketHistory);

/**
 * @swagger
 * /api/calls/{ticketId}/auto-assign:
 *   patch:
 */
router.patch("/:ticketId/auto-assign", requireOtpVerified, requireAdmin, autoAssignTicket);

export default router;