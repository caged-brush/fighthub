import express from "express";

const router = express.Router();

export default function profileRoutes(db, upload) {
  // Change Profile Picture
  router.put(
    "/change-profile-pic",
    upload.single("profile_picture"),
    async (req, res) => {
      const { userId } = req.body;
      const profilePictureUrl = req.file
        ? `/uploads/${req.file.filename}`
        : null;
      if (!userId || !profilePictureUrl) {
        return res
          .status(400)
          .json({ message: "Missing userId or profile picture" });
      }
      try {
        const result = await db.query(
          "UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING *",
          [profilePictureUrl, userId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
          message: "Profile picture updated successfully",
          user: result.rows[0],
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Fighter Info
  router.post("/fighter-info", async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await db.query("SELECT * from users WHERE id=$1", [
        userId,
      ]);
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.log(error);
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
      const result = await db.query(
        `UPDATE users
         SET weight_class = $1,
             date_of_birth = $2,
             wins = $3,
             losses = $4,
             draws = $5,
             fight_style = $6,
             profile_picture_url = $7,
             weight = $8,
             height = $9
         WHERE id = $10
         RETURNING *`,
        [
          weight_class,
          dob,
          wins,
          losses,
          draws,
          fight_style,
          profile_url,
          weight,
          height,
          userId,
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res
        .status(200)
        .json({ message: "Fighter profile updated", user: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
