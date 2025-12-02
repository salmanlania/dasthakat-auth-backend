import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminOnly.js";

import {
  getAllOrders,
  getOrderByIdAdmin,
  updateOrderStatus
} from "../controllers/adminOrderController.js";

const router = express.Router();

router.get("/", requireAuth, adminOnly, getAllOrders);
router.get("/:id", requireAuth, adminOnly, getOrderByIdAdmin);
router.put("/:id/status", requireAuth, adminOnly, updateOrderStatus);

export default router;
