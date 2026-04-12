import express from "express";
import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();


// =========================
// Create Ticket
// =========================

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     description: Creates a new ATM ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [atm_id, issue]
 *             properties:
 *               atm_id:
 *                 type: string
 *                 example: ATM_001
 *               issue:
 *                 type: string
 *                 example: Cash dispenser failure
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/tickets", requireOtpVerified, async (req, res) => {
  try {
    const { atm_id, issue } = req.body;

    // TODO: replace with real DB logic
    const newTicket = {
      id: Date.now(),
      atm_id,
      issue,
      status: "open",
      created_at: new Date(),
    };

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: newTicket,
    });
  } catch (err) {
    console.error("Create ticket error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;