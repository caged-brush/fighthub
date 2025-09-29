import express from "express";
const router = express.Router();

export default function followersRoute(db) {
  router.post("/follow", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      const existingFollow = await db.query(
        "SELECT * FROM followers WHERE follower_id=$1 AND following_id=$2",
        [followerId, followingId]
      );
      if (existingFollow.rows.length > 0) {
        return res.status(200).json({ message: "Already following" });
      }
      await db.query(
        "INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)",
        [followerId, followingId]
      );
      return res.status(200).json({ message: "Followed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/unfollow", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      await db.query(
        "DELETE FROM followers WHERE follower_id=$1 AND following_id=$2",
        [followerId, followingId]
      );
      res.status(200).json({ message: "Unfollowed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/is-following", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      const result = await db.query(
        "SELECT 1 FROM followers WHERE follower_id=$1 AND following_id=$2",
        [followerId, followingId]
      );
      res.status(200).json({ isFollowing: result.rows.length > 0 });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/follower-count", async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await db.query(
        "SELECT COUNT(*) FROM followers WHERE following_id = $1",
        [userId]
      );
      const count = parseInt(result.rows[0].count, 10);
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/following-count", async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await db.query(
        "SELECT COUNT(*) FROM followers WHERE follower_id = $1",
        [userId]
      );
      const count = parseInt(result.rows[0].count, 10);
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/follower-list", async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await db.query(
        "SELECT u.id, u.fname, u.lname, u.profile_picture_url FROM followers f JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1",
        [userId]
      );
      const followers = result.rows.map((row) => ({
        id: row.id,
        fname: row.fname,
        lname: row.lname,
        profile_picture_url: row.profile_picture_url
          ? `http://10.50.107.1:3000/${row.profile_picture_url}`
          : null,
      }));
      res.status(200).json({ followers });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
