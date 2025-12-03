import {
  getAdminStatsService
} from "../services/adminStatsService.js";

export const getAdminStats = async (req, res) => {
  try {
    const stats = await getAdminStatsService();
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error("Admin Stats Error:", err);
    return res.status(500).json({ error: "Failed to fetch admin stats" });
  }
};