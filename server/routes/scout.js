import express from "express";

const router = express.Router();

export default function scoutsRoutes(supabase, requireAuth) {
  /**
   * =====================================
   * GET OWN SCOUT PROFILE
   * =====================================
   */
  router.get("/me", requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
      const { data, error } = await supabase
        .from("scouts")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      res.json(data);
    } catch {
      res.status(404).json({ message: "Scout profile not found" });
    }
  });

  /**
   * =====================================
   * CREATE / UPDATE OWN SCOUT PROFILE
   * =====================================
   */
  router.put("/me", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "scout") {
      return res.status(403).json({ message: "Only scouts allowed" });
    }

    const { organization, region, experience_level, date_of_birth } = req.body;

    try {
      // update DOB in users table
      if (date_of_birth) {
        await supabase.from("users").update({ date_of_birth }).eq("id", userId);
      }

      // upsert scout profile
      const { data, error } = await supabase
        .from("scouts")
        .upsert(
          { user_id: userId, organization, region, experience_level },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      res.json({ message: "Scout profile saved", scout: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update scout profile" });
    }
  });

  return router;
}
