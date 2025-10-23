import express from "express";
import fs from "fs";

const router = express.Router();

export default function profileRoutes(supabase, upload) {
  // Change Profile Picture
  router.put(
    "/change-profile-pic",
    upload.single("profile_picture"),
    async (req, res) => {
      const { userId } = req.body;

      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ message: "No profile picture uploaded" });
        }

        // Upload to Supabase Storage
        const filename = `${userId}-${Date.now()}-${req.file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(filename, fs.createReadStream(req.file.path), {
            contentType: req.file.mimetype,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Clean up local file
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          /* ignore */
        }

        // Update user profile with new image path
        const { data: userData, error: updateError } = await supabase
          .from("users")
          .update({ profile_picture_url: uploadData.path })
          .eq("id", userId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Generate signed URL if using private bucket
        let signedUrl = null;
        if (global.supabaseAdmin) {
          const { data: signed } = await global.supabaseAdmin.storage
            .from("profiles")
            .createSignedUrl(uploadData.path, 3600);
          if (signed) signedUrl = signed.signedUrl;
        }

        res.status(200).json({
          message: "Profile picture updated successfully",
          user: { ...userData, profile_signed_url: signedUrl },
        });
      } catch (error) {
        console.error("Profile picture update error:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Fighter Info
  router.post("/fighter-info", async (req, res) => {
    const { userId } = req.body;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate signed URL for profile picture if exists
      if (user.profile_picture_url && global.supabaseAdmin) {
        const { data: signed } = await global.supabaseAdmin.storage
          .from("profiles")
          .createSignedUrl(user.profile_picture_url, 3600);
        if (signed) user.profile_signed_url = signed.signedUrl;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Fighter info error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update Fighter Profile
  router.put("/update-fighter", async (req, res) => {
    const {
      userId,
      weight_class,
      dob,
      wins,
      losses,
      draws,
      fight_style,
      profile_url,
      weight,
      height,
    } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .update({
          weight_class,
          date_of_birth: dob,
          wins,
          losses,
          draws,
          fight_style,
          profile_picture_url: profile_url,
          weight,
          height,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate signed URL for profile picture if exists
      if (user.profile_picture_url && global.supabaseAdmin) {
        const { data: signed } = await global.supabaseAdmin.storage
          .from("profiles")
          .createSignedUrl(user.profile_picture_url, 3600);
        if (signed) user.profile_signed_url = signed.signedUrl;
      }

      res.status(200).json({
        message: "Fighter profile updated",
        user,
      });
    } catch (error) {
      console.error("Update fighter error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
