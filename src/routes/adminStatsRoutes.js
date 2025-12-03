import express from "express";
import { adminOnly } from "../middleware/adminOnly.js";
import { getAdminStats } from "../controllers/adminStatsController.js";

const router = express.Router();

router.get("/", adminOnly, getAdminStats);

export default router;