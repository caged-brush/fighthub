import express from "express";
function getErrorMessage(error, fallback = "Failed to load inbox") {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string") {
        return error.message;
    }
    return fallback;
}
export default function inboxRoutes(supabase, requireAuth) {
    const router = express.Router();
    router.get("/me", requireAuth, async (req, res) => {
        const myId = req.user?.id;
        if (!myId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            const { data: msgs, error } = await supabase
                .from("messages")
                .select("id, sender_id, recipient_id, message, timestamp")
                .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
                .order("timestamp", { ascending: false })
                .limit(300);
            if (error) {
                throw error;
            }
            const typedMessages = (msgs ?? []);
            const latestByOther = new Map();
            for (const m of typedMessages) {
                const other = String(m.sender_id) === myId
                    ? String(m.recipient_id)
                    : String(m.sender_id);
                if (!latestByOther.has(other)) {
                    latestByOther.set(other, m);
                }
            }
            const otherIds = Array.from(latestByOther.keys());
            if (otherIds.length === 0) {
                return res.json({ conversations: [] });
            }
            const { data: users, error: uErr } = await supabase
                .from("users")
                .select("id, fname, lname, role, profile_picture_url")
                .in("id", otherIds);
            if (uErr) {
                throw uErr;
            }
            const typedUsers = (users ?? []);
            const userMap = new Map(typedUsers.map((u) => [String(u.id), u]));
            const conversations = otherIds.map((otherId) => {
                const u = userMap.get(String(otherId));
                const last = latestByOther.get(String(otherId));
                return {
                    userId: otherId,
                    name: u ? `${u.fname || ""} ${u.lname || ""}`.trim() : "Unknown",
                    role: u?.role || null,
                    profile_picture_url: u?.profile_picture_url || null,
                    lastMessage: last?.message || "",
                    lastTimestamp: last?.timestamp || null,
                };
            });
            conversations.sort((a, b) => {
                const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
                const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
                return tb - ta;
            });
            return res.json({ conversations });
        }
        catch (err) {
            console.error("GET /inbox/me error:", getErrorMessage(err));
            return res.status(500).json({ message: "Failed to load inbox" });
        }
    });
    return router;
}
