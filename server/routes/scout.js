// scoutsRoutes.js
import express from "express";

const router = express.Router();

export default function scoutsRoutes(supabase, requireAuth) {
  router.get("/me", requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
      const { data, error } = await supabase
        .from("scouts")
        .select(
          `
        user_id,
        organization,
        region,
        users (
          fname,
          lname,
          profile_picture_url,
          region
        )
      `
        )
        .eq("user_id", userId)
        .maybeSingle(); // <-- change this

      if (error) {
        console.error("GET /scouts/me supabase error:", error);
        return res.status(500).json({ message: "Server error" });
      }

      if (!data) {
        return res.status(404).json({ message: "Scout profile not found" });
      }

      return res.json(data);
    } catch (err) {
      console.error("GET /scouts/me crash:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  router.put("/me", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "scout") {
      return res.status(403).json({ message: "Only scouts allowed" });
    }

    const { organization, region, date_of_birth } = req.body;

    // Don't mark onboarded unless these exist
    if (!date_of_birth || !organization || !region) {
      return res.status(400).json({
        message: "date_of_birth, organization, and region are required",
      });
    }

    try {
      // 1) update users table (DOB + region + onboarding flag)
      const { error: usersErr } = await supabase
        .from("users")
        .update({
          date_of_birth,
          region, // ✅ store region on users
          scout_onboarded: true,
        })
        .eq("id", userId);

      if (usersErr) throw usersErr;

      // 2) upsert scout profile (region here is optional, but fine)
      const { data: scout, error: scoutErr } = await supabase
        .from("scouts")
        .upsert(
          { user_id: userId, organization, region },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (scoutErr) throw scoutErr;

      return res.json({
        message: "Scout profile saved",
        scout,
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
