import {
  getAllOrdersService,
  getOrderByIdAdminService,
  updateOrderStatusService
} from "../services/adminOrderService.js";

export const getAllOrders = async (req, res) => {
  try {
    const orders = await getAllOrdersService();
    return res.json({ ok: true, orders });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const getOrderByIdAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await getOrderByIdAdminService(id);
    return res.json({ ok: true, order });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { payment_status } = req.body;

    const updated = await updateOrderStatusService(id, payment_status);

    return res.json({ ok: true, order: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status" });
  }
};