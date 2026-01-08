// routes/inbox.js
import express from "express";

const router = express.Router();

export default function inboxRoutes(supabase, requireAuth) {
  // returns conversations for logged-in user
  router.get("/me", requireAuth, async (req, res) => {
    const myId = String(req.user.id);

    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, message, created_at")
        .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
        .order("created_at", { ascending: false })
        .limit(300); // enough for MVP inbox

      if (error) throw error;

      // pick latest message per “other user”
      const latestByOther = new Map();

      for (const m of msgs || []) {
        const other =
          String(m.sender_id) === myId
            ? String(m.recipient_id)
            : String(m.sender_id);

        if (!latestByOther.has(other)) {
          latestByOther.set(other, m);
        }
      }

      const otherIds = Array.from(latestByOther.keys());
      if (otherIds.length === 0) return res.json({ conversations: [] });

      // get user info for those ids
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, fname, lname, role, profile_picture_url")
        .in("id", otherIds);

      if (uErr) throw uErr;

      const userMap = new Map((users || []).map((u) => [String(u.id), u]));

      const conversations = otherIds.map((otherId) => {
        const u = userMap.get(String(otherId));
        const last = latestByOther.get(String(otherId));

        return {
          userId: otherId,
          name: u ? `${u.fname || ""} ${u.lname || ""}`.trim() : "Unknown",
          role: u?.role || null,
          profile_picture_url: u?.profile_picture_url || null,
          lastMessage: last?.message || "",
          lastTimestamp: last?.created_at || null,
        };
      });

      // sort by lastTimestamp desc
      conversations.sort((a, b) => {
        const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
        const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
        return tb - ta;
      });

      res.json({ conversations });
    } catch (err) {
      console.error("GET /inbox/me error:", err?.message || err);
      res.status(500).json({ message: "Failed to load inbox" });
    }
  });

  return router;
}
