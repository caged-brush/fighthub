import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
function getErrorMessage(error, fallback = "Server error") {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string") {
        return error.message;
    }
    return fallback;
}
function toNullableNumber(value) {
    if (value === undefined || value === null || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
}
export default function fightersRoutes(supabase, requireAuth) {
    const router = express.Router();
    router.get("/search", async (req, res) => {
        const { weight_class, min_wins, style, region, limit = "20", offset = "0", } = req.query;
        try {
            let userIds = null;
            if (region && String(region).trim()) {
                const regionQuery = String(region).trim();
                const { data: users, error: usersErr } = await supabase
                    .from("users")
                    .select("id")
                    .ilike("region", `%${regionQuery}%`);
                if (usersErr)
                    throw usersErr;
                userIds = (users ?? []).map((u) => u.id);
                if (userIds.length === 0) {
                    return res.status(200).json([]);
                }
            }
            const parsedLimit = Number.parseInt(String(limit), 10);
            const parsedOffset = Number.parseInt(String(offset), 10);
            const safeLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
            const safeOffset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
            let query = supabase
                .from("fighters")
                .select(`
            user_id,
            weight_class,
            wins,
            losses,
            draws,
            height,
            weight,
            fight_style,
            gym,
            bio,
            is_available,
            users (
              fname,
              lname,
              profile_picture_url,
              region
            )
          `)
                .order("wins", { ascending: false })
                .range(safeOffset, safeOffset + safeLimit - 1);
            if (weight_class) {
                query = query.eq("weight_class", weight_class);
            }
            if (min_wins !== undefined && String(min_wins).trim() !== "") {
                query = query.gte("wins", Number(min_wins));
            }
            if (style && String(style).trim()) {
                query = query.textSearch("fight_style", String(style).trim(), {
                    type: "websearch",
                });
            }
            if (userIds) {
                query = query.in("user_id", userIds);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return res.status(200).json((data ?? []));
        }
        catch (err) {
            console.error("GET /fighters/search error:", getErrorMessage(err));
            return res.status(500).json({ message: "Search failed" });
        }
    });
    router.get("/:userId", async (req, res) => {
        const { userId } = req.params;
        try {
            const { data, error } = await supabase
                .from("fighters")
                .select(`
            *,
            users (
              fname,
              lname,
              profile_picture_url,
              region
            )
          `)
                .eq("user_id", userId)
                .single();
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch {
            return res.status(404).json({ message: "Fighter not found" });
        }
    });
    router.put("/me", requireAuth, async (req, res) => {
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (role !== "fighter") {
            return res
                .status(403)
                .json({ message: "Only fighters can edit profiles" });
        }
        const { weight_class, date_of_birth, region, wins, losses, draws, fight_style, height, weight, gym, bio, is_available, } = req.body;
        const ALLOWED_REGIONS = new Set([
            "BC",
            "AB",
            "SK",
            "MB",
            "ON",
            "QC",
            "NB",
            "NS",
            "PE",
            "NL",
            "YT",
            "NT",
            "NU",
        ]);
        const regionClean = typeof region === "string" ? region.trim().toUpperCase() : "";
        if (!regionClean) {
            return res.status(400).json({ message: "Region is required." });
        }
        if (!ALLOWED_REGIONS.has(regionClean)) {
            return res.status(400).json({
                message: "Invalid region. Must be a Canadian province/territory code (e.g., BC, ON).",
            });
        }
        const w = toNullableNumber(wins);
        const l = toNullableNumber(losses);
        const d = toNullableNumber(draws);
        const h = toNullableNumber(height);
        const wt = toNullableNumber(weight);
        if ([w, l, d, h, wt].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) {
            return res.status(400).json({ message: "Invalid numeric values" });
        }
        const gymClean = typeof gym === "string" ? gym.trim() : null;
        const bioClean = typeof bio === "string" ? bio.trim() : null;
        const avail = is_available === undefined || is_available === null
            ? null
            : Boolean(is_available);
        try {
            const { data: fighter, error: fighterErr } = await supabaseAdmin
                .from("fighters")
                .upsert({
                user_id: userId,
                weight_class: weight_class ?? null,
                wins: w ?? 0,
                losses: l ?? 0,
                draws: d ?? 0,
                fight_style: fight_style ?? null,
                height: h,
                weight: wt,
                gym: gymClean,
                bio: bioClean,
                is_available: avail ?? true,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
                .select()
                .single();
            if (fighterErr)
                throw fighterErr;
            const userUpdate = {
                fighter_onboarded: true,
                region: regionClean,
            };
            if (date_of_birth) {
                userUpdate.date_of_birth = date_of_birth;
            }
            const { error: userErr } = await supabase
                .from("users")
                .update(userUpdate)
                .eq("id", userId);
            if (userErr)
                throw userErr;
            return res.status(200).json({
                message: "Fighter profile saved",
                fighter: fighter,
                fighter_onboarded: true,
            });
        }
        catch (err) {
            console.error("PUT /fighters/me error:", getErrorMessage(err));
            return res.status(500).json({ message: "Failed to update fighter" });
        }
    });
    return router;
}
