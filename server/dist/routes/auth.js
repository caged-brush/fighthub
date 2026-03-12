import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import requireAuth from "../middleware/requireAuth.js";
const router = express.Router();
router.post("/register", async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        return res
            .status(400)
            .json({ message: "email and password are required" });
    }
    if (!role || !["fighter", "scout"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error } = await supabaseAdmin.auth.signUp({
        email: normalizedEmail,
        password: String(password),
        options: {
            emailRedirectTo: process.env.EMAIL_CONFIRM_REDIRECT || undefined,
        },
    });
    if (error) {
        return res.status(400).json({ message: error.message });
    }
    const userId = data.user?.id;
    if (!userId) {
        return res.status(500).json({ message: "Failed to create auth user" });
    }
    await supabaseAdmin.from("users").upsert({ id: userId, role });
    if (role === "fighter") {
        await supabaseAdmin.from("fighters").upsert({ user_id: userId });
    }
    else {
        await supabaseAdmin.from("scouts").upsert({ user_id: userId });
    }
    return res.status(200).json({
        message: "Account created. Check your email to verify.",
    });
});
router.get("/me", requireAuth, async (req, res) => {
    if (!req.user) {
        return res.status(404).json({ message: "User profile not found" });
    }
    return res.status(200).json({
        id: req.user.id,
        role: req.user.role,
    });
});
export default router;
