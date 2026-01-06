import express from "express";

const router = express.Router();

export default function fightersRoutes(supabase, requireAuth) {
  /**
   * =====================================
   * SEARCH / DISCOVER FIGHTERS (PUBLIC)
   * =====================================
   * Scouts + Fighters can access
   */
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
            profile_picture_url
          )
        `
        )
        .order("wins", { ascending: false })
        .range(offset, offset + limit - 1);

      if (weight_class) query = query.eq("weight_class", weight_class);
      if (min_wins) query = query.gte("wins", min_wins);
      if (style)
        query = query.textSearch("fight_style", style, {
          type: "websearch",
        });

      const { data, error } = await query;

      if (error) throw error;

      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  /**
   * =====================================
   * GET SINGLE FIGHTER PROFILE (PUBLIC)
   * =====================================
   */
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
            profile_picture_url
          )
        `
        )
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (err) {
      res.status(404).json({ message: "Fighter not found" });
    }
  });

  /**
   * =====================================
   * CREATE / UPDATE OWN FIGHTER PROFILE
   * (FIGHTER ONLY)
   * =====================================
   */
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
      wins,
      losses,
      draws,
      fight_style,
      height,
      weight,
    } = req.body;

    // Safer numeric validation (your current check misses undefined/null)
    const toNum = (v) => (v === undefined || v === null ? null : Number(v));
    const w = toNum(wins);
    const l = toNum(losses);
    const d = toNum(draws);

    if ([w, l, d].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) {
      return res.status(400).json({ message: "Invalid record values" });
    }

    try {
      // 1) Update fighter stats
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
            updated_at: new Date().toISOString(), // ✅ better for Supabase
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (fighterErr) throw fighterErr;

      // 2) Mark onboarding in users table
      const userUpdate = { fighter_onboarded: true };
      if (date_of_birth) userUpdate.date_of_birth = date_of_birth;

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
      console.error("update fighter error:", err);
      return res.status(500).json({ message: "Failed to update fighter" });
    }
  });

  /**
   * =====================================
   * DELETE FIGHTER PROFILE (ADMIN ONLY)
   * =====================================
   * Fighters should NEVER delete their own record
   */
  router.delete("/:userId", requireAuth, async (req, res) => {
    const role = req.user.role;

    if (role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    try {
      const { error } = await supabase
        .from("fighters")
        .delete()
        .eq("user_id", req.params.userId);

      if (error) throw error;

      res.status(200).json({ message: "Fighter removed" });
    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  return router;
}
