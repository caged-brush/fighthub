// fightersRoutes.js
import express from "express";

const router = express.Router();

export default function fightersRoutes(supabase, requireAuth) {
  router.get("/search", async (req, res) => {
    const {
      weight_class,
      min_wins,
      style,
      region,
      limit = 20,
      offset = 0,
    } = req.query;

    try {
      let userIds = null;

      // 1) REGION FILTER (reliable)
      if (region && String(region).trim()) {
        const regionQuery = String(region).trim();

        const { data: users, error: usersErr } = await supabase
          .from("users")
          .select("id")
          .ilike("region", `%${regionQuery}%`);

        if (usersErr) throw usersErr;

        userIds = (users || []).map((u) => u.id);

        // no matching users => no fighters
        if (userIds.length === 0) return res.status(200).json([]);
      }

      // 2) FIGHTER QUERY
      let query = supabase
        .from("fighters")
        .select(
          `
          user_id,
          weight_class,
          wins,
          losses,
          draws,
          height,
          weight,
          fight_style,
          users (
            fname,
            lname,
            profile_picture_url,
            region
          )
        `
        )
        .order("wins", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (weight_class) query = query.eq("weight_class", weight_class);

      if (min_wins !== undefined && String(min_wins).trim() !== "") {
        query = query.gte("wins", Number(min_wins));
      }

      if (style && String(style).trim()) {
        query = query.textSearch("fight_style", String(style).trim(), {
          type: "websearch",
        });
      }

      if (userIds) query = query.in("user_id", userIds);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data || []);
    } catch (err) {
      console.error("GET /fighters/search error:", err);
      return res.status(500).json({ message: "Search failed" });
    }
  });

  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
      const { data, error } = await supabase
        .from("fighters")
        .select(
          `
          *,
          users (
            fname,
            lname,
            profile_picture_url,
            region
          )
        `
        )
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch {
      return res.status(404).json({ message: "Fighter not found" });
    }
  });

  router.put("/me", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "fighter") {
      return res
        .status(403)
        .json({ message: "Only fighters can edit profiles" });
    }

    const {
      weight_class,
      date_of_birth,
      region, // ✅ add this to your fighter onboarding UI
      wins,
      losses,
      draws,
      fight_style,
      height,
      weight,
    } = req.body;

    const toNum = (v) => (v === undefined || v === null ? null : Number(v));
    const w = toNum(wins);
    const l = toNum(losses);
    const d = toNum(draws);

    if ([w, l, d].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) {
      return res.status(400).json({ message: "Invalid record values" });
    }

    try {
      // 1) Update fighter row
      const { data: fighter, error: fighterErr } = await supabase
        .from("fighters")
        .upsert(
          {
            user_id: userId,
            weight_class,
            wins: w ?? 0,
            losses: l ?? 0,
            draws: d ?? 0,
            fight_style,
            height,
            weight,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (fighterErr) throw fighterErr;

      // 2) Update users row (onboarding + optional DOB + optional region)
      const userUpdate = {
        fighter_onboarded: true,
      };
      if (date_of_birth) userUpdate.date_of_birth = date_of_birth;
      if (region) userUpdate.region = region; // ✅ store region on users

      const { error: userErr } = await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", userId);

      if (userErr) throw userErr;

      return res.status(200).json({
        message: "Fighter profile saved",
        fighter,
        fighter_onboarded: true,
      });
    } catch (err) {
      console.error("PUT /fighters/me error:", err);
      return res.status(500).json({ message: "Failed to update fighter" });
    }
  });

  return router;
}
