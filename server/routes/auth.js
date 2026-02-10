import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import requireAuth from "../middleware/requireAuth.js"; // this must verify Supabase token + load public.users

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }
  if (!["fighter", "scout"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  // Create auth user (Supabase will email verify if enabled in dashboard)
  const { data, error } = await supabaseAdmin.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    options: {
      emailRedirectTo: process.env.EMAIL_CONFIRM_REDIRECT || undefined,
    },
  });

  if (error) return res.status(400).json({ message: error.message });
  const userId = data.user?.id;
  if (!userId) return res.status(500).json({ message: "Failed to create auth user" });

  // Ensure profile exists (trigger should do this, but this is a safe fallback)
  await supabaseAdmin.from("users").upsert({ id: userId, role });

  // Create role-specific row
  if (role === "fighter") {
    await supabaseAdmin.from("fighters").upsert({ user_id: userId });
  } else {
    await supabaseAdmin.from("scouts").upsert({ user_id: userId });
  }

  return res.status(200).json({
    message: "Account created. Check your email to verify.",
  });
});

/**
 * GET /me
 * client sends Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
 */
router.get("/me", requireAuth, async (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    role: req.user.role,
  });
});

export default router;
