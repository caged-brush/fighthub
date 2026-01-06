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

    // basic validation (don’t mark onboarded if they send empty junk)
    if (!organization || !region || !date_of_birth) {
      return res.status(400).json({
        message: "organization, region, and date_of_birth are required",
      });
    }

    try {
      // 1) update DOB + onboarded flag in users table
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          date_of_birth,
          scout_onboarded: true, // ✅ this is the key line
        })
        .eq("id", userId);

      if (userUpdateError) throw userUpdateError;

      // 2) upsert scout profile
      const { data, error } = await supabase
        .from("scouts")
        .upsert(
          { user_id: userId, organization, region, experience_level },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return res.json({
        message: "Scout profile saved",
        scout: data,
        scout_onboarded: true,
      });
    } catch (err) {
      console.error("PUT /scouts/me error:", err);
      return res
        .status(500)
        .json({ message: "Failed to update scout profile" });
    }
  });

  return router;
}
