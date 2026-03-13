import express from "express";
import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/tickets", requireOtpVerified, async (req, res) => {
  // create ticket
  res.json({ message: "Ticket created successfully" });
});

export default router;