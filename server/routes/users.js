import express from "express";
const router = express.Router();

export default function usersRoute(supabase) {
  router.get("/users", async (req, res) => {
    const { exclude } = req.query;
    try {
      let query = supabase.from("users").select(`
          id,
          fname,
          profile_picture_url,
          messages!sender_id (
            message,
            timestamp
          ),
          messages!recipient_id (
            message,
            timestamp
          )
        `);

      // Add filter if exclude parameter is present
      if (exclude) {
        query = query.neq("id", exclude);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      // Process the data to match the previous format
      const processedUsers = users.map((user) => {
        // Get last message from both sent and received messages
        const sentMessages = user.messages?.sender_id || [];
        const receivedMessages = user.messages?.recipient_id || [];
        const allMessages = [...sentMessages, ...receivedMessages].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        return {
          id: user.id,
          fname: user.fname,
          profile_picture_url: user.profile_picture_url,
          last_message: allMessages[0]?.message || null,
        };
      });

      // If using private storage, generate signed URLs
      if (global.supabaseAdmin) {
        await Promise.all(
          processedUsers.map(async (user) => {
            if (user.profile_picture_url) {
              const { data: signed } = await global.supabaseAdmin.storage
                .from("profiles")
                .createSignedUrl(user.profile_picture_url, 3600);
              if (signed) user.profile_signed_url = signed.signedUrl;
            }
          })
        );
      }

      res.json(processedUsers);
    } catch (err) {
      console.error("Users fetch error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
