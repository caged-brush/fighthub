import express from "express";
import requireAuth from "../middleware/requireAuth.js"; // Supabase-token middleware
import { supabaseAdmin } from "../config/supabaseAdmin.js";

const router = express.Router();

router.post("/set-role", requireAuth, async (req, res) => {
  const { role } = req.body;
  if (!["fighter", "scout"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  // req.user.id is auth.uid() profile id
  const userId = req.user.id;

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) return res.status(400).json({ message: error.message });

  // create role tables if needed
  if (role === "fighter") {
    await supabaseAdmin.from("fighters").upsert({ user_id: userId });
  } else {
    await supabaseAdmin.from("scouts").upsert({ user_id: userId });
  }

  return res.json({ ok: true, role });
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

export default router;
