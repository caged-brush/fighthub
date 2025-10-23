import express from "express";
const router = express.Router();

export default function followersRoute(supabase) {
  router.post("/follow", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      // Check if already following
      const { data: existingFollow, error: checkError } = await supabase
        .from("followers")
        .select("*")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFollow) {
        return res.status(200).json({ message: "Already following" });
      }

      // Insert new follow
      const { error: insertError } = await supabase
        .from("followers")
        .insert([{ follower_id: followerId, following_id: followingId }]);

      if (insertError) throw insertError;

      return res.status(200).json({ message: "Followed successfully" });
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/unfollow", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

      if (error) throw error;
      res.status(200).json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Unfollow error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/is-following", async (req, res) => {
    const { followerId, followingId } = req.body;
    try {
      const { data, error } = await supabase
        .from("followers")
        .select("*")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (error) throw error;
      res.status(200).json({ isFollowing: !!data });
    } catch (error) {
      console.error("Is-following check error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/follower-count", async (req, res) => {
    const { userId } = req.body;
    try {
      const { count, error } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      if (error) throw error;
      res.status(200).json({ count: count || 0 });
    } catch (error) {
      console.error("Follower count error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/following-count", async (req, res) => {
    const { userId } = req.body;
    try {
      const { count, error } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      if (error) throw error;
      res.status(200).json({ count: count || 0 });
    } catch (error) {
      console.error("Following count error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/follower-list", async (req, res) => {
    const { userId } = req.body;
    try {
      const { data, error } = await supabase
        .from("followers")
        .select(
          `
          follower_id,
          users!followers_follower_id_fkey (
            id,
            fname,
            lname,
            profile_pic
          )
        `
        )
        .eq("following_id", userId);

      if (error) throw error;

      // Transform the nested data structure
      const followers = data.map((row) => ({
        id: row.users.id,
        fname: row.users.fname,
        lname: row.users.lname,
        profile_pic: row.users.profile_pic,
      }));

      // If using private storage, get signed URLs for profile pics
      if (followers.length > 0 && global.supabaseAdmin) {
        await Promise.all(
          followers.map(async (follower) => {
            if (follower.profile_pic) {
              const { data: signed } = await global.supabaseAdmin.storage
                .from("profiles")
                .createSignedUrl(follower.profile_pic, 3600);
              if (signed) follower.profile_picture_url = signed.signedUrl;
            }
          })
        );
      }

      res.status(200).json({ followers });
    } catch (error) {
      console.error("Follower list error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
