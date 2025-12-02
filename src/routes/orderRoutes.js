import express from "express";
import { authCustomer } from "../middleware/authMiddleware.js";
import {
  createOrder,
  getMyOrders,
  getSingleOrder,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", authCustomer, createOrder);
router.get("/", authCustomer, getMyOrders);
router.get("/:id", authCustomer, getSingleOrder);

export default router;