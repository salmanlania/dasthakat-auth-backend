import { supabaseAdmin } from "../config/supabaseClient.js";

export const getAllOrdersService = async () => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, customers(*), products(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getOrderByIdAdminService = async (id) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, customers(*), products(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const updateOrderStatusService = async (id, payment_status) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ payment_status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
};