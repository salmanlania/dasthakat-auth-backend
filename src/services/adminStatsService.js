import { supabaseAdmin } from "../config/supabaseClient.js";

export const getAdminStatsService = async () => {
    // Total Customers
    const { count: total_customers } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact", head: true });

    // Total Orders
    const { count: total_orders } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true });

    // Pending Orders
    const { count: pending_orders } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "pending");

    // Completed Orders
    const { count: completed_orders } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "paid");

    // Revenue
    const { data: revenueRows } = await supabaseAdmin
        .from("orders")
        .select("total_amount");

    const revenue = revenueRows?.reduce((sum, row) => sum + row.total_amount, 0) || 0;

    // Today Sales
    const today = new Date().toISOString().slice(0, 10);

    const { data: todaySalesRows } = await supabaseAdmin
        .from("orders")
        .select("total_amount")
        .gte("order_date", today);

    const today_sales = todaySalesRows?.reduce((sum, row) => sum + row.total_amount, 0) || 0;

    // Monthly Sales
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const { data: monthSalesRows } = await supabaseAdmin
        .from("orders")
        .select("total_amount")
        .gte("order_date", monthStartISO);

    const monthly_sales = monthSalesRows?.reduce((sum, row) => sum + row.total_amount, 0) || 0;

    // Top Selling Products (Updated)
    const { data: topProducts } = await supabaseAdmin
        .from("orders")
        .select("product_name, product_code, quantity, total_amount")
        .order("quantity", { ascending: false })
        .limit(5);

    return {
        total_customers,
        total_orders,
        pending_orders,
        completed_orders,
        revenue,
        today_sales,
        monthly_sales,
        top_selling_products: topProducts,
    };
};