import express from "express";
import { getEngineers } from "../controllers/engineerController.js";

const router = express.Router();

router.get("/", getEngineers);

export default router;