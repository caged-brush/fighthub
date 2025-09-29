import express from "express";
const router = express.Router();

export default function likesRoute(db) {
  router.post("/like", async (req, res) => {
    const { userId, postId } = req.body;
    try {
      const existingResult = await db.query(
        "SELECT * from likes WHERE user_id=$1 and post_id=$2",
        [userId, postId]
      );
      if (existingResult.rows.length > 0) {
        return res.status(200).json({ message: "Post already liked" });
      }
      await db.query("INSERT into likes (user_id,post_id) VALUES ($1,$2)", [
        userId,
        postId,
      ]);
      return res.status(200).json({ message: "Post liked successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/unlike", async (req, res) => {
    const { userId, postId } = req.body;
    try {
      const check = await db.query(
        "DELETE FROM likes WHERE user_id=$1 AND post_id=$2 RETURNING *",
        [userId, postId]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ message: "No post to unlike" });
      }
      return res.status(200).json({ message: "Post unliked successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/like-count", async (req, res) => {
    const { postId } = req.body;
    try {
      const result = await db.query(
        "SELECT COUNT(*) FROM likes WHERE post_id=$1",
        [postId]
      );
      const likeCount = parseInt(result.rows[0].count, 10);
      return res.status(200).json({ likes: likeCount });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/like-counts", async (req, res) => {
    const { postIds } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res
        .status(400)
        .json({ error: "postIds must be a non-empty array" });
    }
    try {
      const result = await db.query(
        `SELECT post_id, COUNT(*) AS count
         FROM likes
         WHERE post_id = ANY($1)
         GROUP BY post_id`,
        [postIds]
      );
      const counts = {};
      postIds.forEach((id) => {
        counts[id] = 0;
      });
      result.rows.forEach((row) => {
        counts[row.post_id] = parseInt(row.count, 10);
      });
      return res.status(200).json(counts);
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/liked-posts", async (req, res) => {
    const { userId } = req.body;
    try {
      const result = await db.query(
        "SELECT post_id FROM likes WHERE user_id = $1",
        [userId]
      );
      const likedPostIds = result.rows.map((row) => row.post_id);
      res.json({ likedPostIds });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
