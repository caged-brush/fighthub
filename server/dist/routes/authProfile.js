import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { supabaseAdmin } from "../config/supabase.js";
const router = express.Router();
router.post("/set-role", requireAuth, async (req, res) => {
    const { role } = req.body;
    if (role !== "fighter" && role !== "scout") {
        return res.status(400).json({ message: "Invalid role" });
    }
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;
    const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ role })
        .eq("id", userId);
    if (updateError) {
        return res.status(400).json({ message: updateError.message });
    }
    if (role === "fighter") {
        const { error: fighterError } = await supabaseAdmin
            .from("fighters")
            .upsert({ user_id: userId });
        if (fighterError) {
            return res.status(500).json({ message: fighterError.message });
        }
    }
    else {
        const { error: scoutError } = await supabaseAdmin
            .from("scouts")
            .upsert({ user_id: userId });
        if (scoutError) {
            return res.status(500).json({ message: scoutError.message });
        }
    }
    return res.json({ ok: true, role });
});
router.get("/me", requireAuth, async (req, res) => {
    return res.json({ user: req.user });
});
export default router;
