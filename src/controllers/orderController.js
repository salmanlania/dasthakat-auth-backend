import {
    createOrderService,
    getOrdersByCustomerService,
    getSingleOrderService,
} from "../services/orderService.js";
import { supabaseAdmin } from "../config/supabaseClient.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";

export const createOrder = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const { product_id, quantity, payment_type, discount_amount = 0 } = req.body;

        if (!product_id || !quantity)
            return res.status(400).json({ error: "Missing fields" });

        // validate product exists
        const { data: product } = await supabaseAdmin
            .from("products")
            .select("id, price")
            .eq("id", product_id)
            .single();

        if (!product) return res.status(404).json({ error: "Product not found" });

        const total_amount = product.price * quantity - discount_amount;

        const orderObj = {
            order_date: new Date().toISOString(),
            order_number: generateOrderNumber(),
            quantity,
            total_amount,
            payment_status: "pending",
            payment_type: payment_type || "cod",
            discount_amount,
            created_at: new Date().toISOString(),
            customer_id,
            product_id,
        };

        const saved = await createOrderService(orderObj);
        return res.json({ ok: true, order: saved });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Order creation failed" });
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const orders = await getOrdersByCustomerService(customer_id);
        return res.json({ ok: true, orders });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch orders" });
    }
};

export const getSingleOrder = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const id = req.params.id;

        const order = await getSingleOrderService(id, customer_id);
        return res.json({ ok: true, order });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch order" });
    }
};