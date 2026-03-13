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
  autoAssignTicket
} from "../controllers/callController.js";

import { requireOtpVerified } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { getCallsByStatus } from "../controllers/callController.js";


const router = express.Router();

/* ==================== TICKET CRUD ==================== */

// Create a new ticket
router.post("/", requireOtpVerified, createCall);
router.get("/status", requireOtpVerified, getCallsByStatus);
// Get all tickets
router.get("/", requireOtpVerified, getTickets);

// Get a single ticket
router.get("/:ticketId", requireOtpVerified, getTicketById);

// Update ticket details (non-status, non-assignment)
router.patch("/:ticketId", requireOtpVerified, updateTicket);




// Delete ticket
router.delete("/:ticketId", requireOtpVerified, requireAdmin(), deleteTicket);

/* ==================== ADMIN ACTIONS ==================== */

// Assign ticket to engineer
router.patch("/:ticketId/assign", requireOtpVerified, requireAdmin(true), assignTicket);

// Update ticket status
router.patch("/:ticketId/status", requireOtpVerified, requireAdmin(true), updateTicketStatus);

// Get ticket assignment / status history
router.get("/:ticketId/history", requireOtpVerified, requireAdmin(), getTicketHistory);
router.patch("/:ticketId/auto-assign", requireOtpVerified, requireAdmin(true), autoAssignTicket);
export default router;