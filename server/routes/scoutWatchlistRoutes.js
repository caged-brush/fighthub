import express from "express";

const router = express.Router();

export default function scoutWatchlistRoutes(supabase, requireAuth) {
  // GET /scouts/watchlist  -> list fighters the scout saved
  router.get("/watchlist", requireAuth, async (req, res) => {
    const userId = req.user.id;

    if (req.user.role !== "scout") {
      return res.status(403).json({ message: "Only scouts allowed" });
    }

    try {
      const { data, error } = await supabase
        .from("scout_watchlist")
        .select(
          `
          fighter_user_id,
          created_at,
          fighters (
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
          )
        `
        )
        .eq("scout_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // flatten into a nice list for the app
      const list = (data || []).map((row) => row.fighters).filter(Boolean);

      return res.json({ watchlist: list });
    } catch (err) {
      console.error("GET /scouts/watchlist error:", err);
      return res.status(500).json({ message: "Failed to load watchlist" });
    }
  });

  // POST /scouts/watchlist/:fighterId -> add
  router.post("/watchlist/:fighterId", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { fighterId } = req.params;

    if (req.user.role !== "scout") {
      return res.status(403).json({ message: "Only scouts allowed" });
    }

    try {
      // optional: verify fighter exists
      const { data: fighter, error: fighterErr } = await supabase
        .from("fighters")
        .select("user_id")
        .eq("user_id", fighterId)
        .maybeSingle();

      if (fighterErr) throw fighterErr;
      if (!fighter)
        return res.status(404).json({ message: "Fighter not found" });

      const { error } = await supabase.from("scout_watchlist").upsert(
        {
          scout_user_id: userId,
          fighter_user_id: fighterId,
        },
        { onConflict: "scout_user_id,fighter_user_id" }
      );

      if (error) throw error;

      return res.json({ ok: true, fighterId });
    } catch (err) {
      console.error("POST /scouts/watchlist error:", err);
      return res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  // DELETE /scouts/watchlist/:fighterId -> remove
  router.delete("/watchlist/:fighterId", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { fighterId } = req.params;

    if (req.user.role !== "scout") {
      return res.status(403).json({ message: "Only scouts allowed" });
    }

    try {
      const { error } = await supabase
        .from("scout_watchlist")
        .delete()
        .eq("scout_user_id", userId)
        .eq("fighter_user_id", fighterId);

      if (error) throw error;

      return res.json({ ok: true, fighterId });
    } catch (err) {
      console.error("DELETE /scouts/watchlist error:", err);
      return res
        .status(500)
        .json({ message: "Failed to remove from watchlist" });
    }
  });

  return router;
}
