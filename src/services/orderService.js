import { supabaseAdmin } from "../config/supabaseClient.js";

export const createOrderService = async (orderData) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert([orderData])
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

export const getOrdersByCustomerService = async (customer_id) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, products(*)")
    .eq("customer_id", customer_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getSingleOrderService = async (id, customer_id) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, products(*)")
    .eq("id", id)
    .eq("customer_id", customer_id)
    .single();

  if (error) throw error;
  return data;
};