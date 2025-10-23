import express from "express";
const router = express.Router();

export default function likesRoute(supabase) {
  router.post("/like", async (req, res) => {
    const { userId, postId } = req.body;
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from("likes")
        .select("*")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLike) {
        return res.status(200).json({ message: "Post already liked" });
      }

      // Insert new like
      const { error: insertError } = await supabase
        .from("likes")
        .insert([{ user_id: userId, post_id: postId }]);

      if (insertError) throw insertError;

      return res.status(200).json({ message: "Post liked successfully" });
    } catch (error) {
      console.error("Like error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/unlike", async (req, res) => {
    const { userId, postId } = req.body;
    try {
      const { data, error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId)
        .select();

      if (error) throw error;

      if (!data?.length) {
        return res.status(404).json({ message: "No post to unlike" });
      }

      return res.status(200).json({ message: "Post unliked successfully" });
    } catch (error) {
      console.error("Unlike error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/like-count", async (req, res) => {
    const { postId } = req.body;
    try {
      const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      if (error) throw error;

      return res.status(200).json({ likes: count || 0 });
    } catch (error) {
      console.error("Like count error:", error);
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
      // Get all likes for the requested postIds
      const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", postIds);

      if (error) throw error;

      // Initialize counts object with zeros
      const counts = {};
      postIds.forEach((id) => {
        counts[id] = 0;
      });

      // Count likes per post
      data.forEach((like) => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
      });

      return res.status(200).json(counts);
    } catch (error) {
      console.error("Like counts error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/liked-posts", async (req, res) => {
    const { userId } = req.body;
    try {
      const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId);

      if (error) throw error;

      const likedPostIds = data.map((row) => row.post_id);
      res.json({ likedPostIds });
    } catch (error) {
      console.error("Liked posts error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
