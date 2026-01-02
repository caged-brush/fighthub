import express from "express";
import fs from "fs";

const router = express.Router();

export default function profileRoutes(supabase, upload, requireAuth) {
  /**
   * ================================
   * CHANGE PROFILE PICTURE (ALL USERS)
   * ================================
   */
  router.put(
    "/change-profile-pic",
    requireAuth,
    upload.single("profile_picture"),
    async (req, res) => {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      try {
        const filename = `${userId}-${Date.now()}-${req.file.originalname}`;

        const { data, error } = await supabase.storage
          .from("profiles")
          .upload(filename, fs.createReadStream(req.file.path), {
            contentType: req.file.mimetype,
            upsert: false,
          });

        if (error) throw error;

        fs.unlinkSync(req.file.path);

        const { data: user, error: updateError } = await supabase
          .from("users")
          .update({ profile_picture_url: data.path })
          .eq("id", userId)
          .select()
          .single();

        if (updateError) throw updateError;

        res.status(200).json({
          message: "Profile picture updated",
          profile_picture_url: data.path,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
      }
    }
  );

  /**
   * ================================
   * GET FIGHTER PROFILE (PUBLIC READ)
   * ================================
   */
  router.get("/fighter/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
      const { data, error } = await supabase
        .from("fighters")
        .select(
          `
          *,
          users (
            id,
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
   * ================================
   * UPDATE FIGHTER PROFILE (FIGHTER ONLY)
   * ================================
   */
  router.put("/update-fighter", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "fighter") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      weight_class,
      dob,
      wins,
      losses,
      draws,
      fight_style,
      weight,
      height,
    } = req.body;

    try {
      const { data, error } = await supabase
        .from("fighters")
        .upsert(
          {
            user_id: userId,
            weight_class,
            date_of_birth: dob,
            wins,
            losses,
            draws,
            fight_style,
            weight,
            height,
            updated_at: new Date(),
          },
          { onConflict: ["user_id"] }
        )
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        message: "Fighter profile updated",
        fighter: data,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update failed" });
    }
  });

  return router;
}
