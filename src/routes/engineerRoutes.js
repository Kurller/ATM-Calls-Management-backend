import express from "express";
import { getEngineers } from "../controllers/engineerController.js";
import { requireOtpVerified } from "../middleware/authMiddleware.js";

const router = express.Router();


// =========================
// Engineers Route
// =========================

/**
 * @swagger
 * /engineers:
 *   get:
 *     summary: Get all engineers
 *     tags: [Engineers]
 *     security:
 *       - cookieAuth: []
 *     description: Returns a list of all registered engineers
 *     responses:
 *       200:
 *         description: Engineers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   status:
 *                     type: string
 */
router.get("/", requireOtpVerified, getEngineers);

export default router;