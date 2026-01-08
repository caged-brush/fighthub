// socket.js
export default function setupSocket(io, supabase) {
  // Map<userIdString, Set<socketId>>
  const users = new Map();

  const norm = (v) => String(v ?? "").trim();

  io.on("connection", (socket) => {
    console.log(`User ${socket.id} connected`);

    socket.on("join", (userId) => {
      const uid = norm(userId);
      if (!uid) return;

      if (!users.has(uid)) users.set(uid, new Set());
      users.get(uid).add(socket.id);

      socket.data.userId = uid;
      console.log(`User ${uid} registered with socket ${socket.id}`);
    });

    socket.on("load-messages", async ({ userId, recipientId }) => {
      const uid = norm(userId);
      const rid = norm(recipientId);
      if (!uid || !rid) return;

      try {
        // messages between uid and rid
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, message, created_at")
          .or(
            `and(sender_id.eq.${uid},recipient_id.eq.${rid}),and(sender_id.eq.${rid},recipient_id.eq.${uid})`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        io.to(socket.id).emit("message-history", data || []);
      } catch (err) {
        console.error("Error loading messaging history:", err?.message || err);
      }
    });

    socket.on("private-message", async ({ recipientId, message, senderId }) => {
      const rid = norm(recipientId);
      const sid = norm(senderId);
      const msg = typeof message === "string" ? message.trim() : "";

      if (!rid || !sid || !msg) return;

      let saved;
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert([{ sender_id: sid, recipient_id: rid, message: msg }])
          .select("id, sender_id, recipient_id, message, created_at")
          .single();

        if (error) throw error;
        saved = data;
      } catch (err) {
        console.error("Error saving message:", err?.message || err);
        return;
      }

      const payload = {
        id: saved.id,
        message: saved.message,
        senderId: saved.sender_id,
        recipientId: saved.recipient_id,
        timestamp: saved.created_at,
      };

      // send to recipient sockets
      const recipientSockets = users.get(rid);
      if (recipientSockets) {
        for (const socketId of recipientSockets) {
          io.to(socketId).emit("private-message", payload);
        }
      }

      // also echo to sender sockets (multi-device)
      const senderSockets = users.get(sid);
      if (senderSockets) {
        for (const socketId of senderSockets) {
          io.to(socketId).emit("private-message", payload);
        }
      }
    });

    socket.on("disconnect", () => {
      const uid = socket.data.userId;
      if (uid && users.has(uid)) {
        const set = users.get(uid);
        set.delete(socket.id);
        if (set.size === 0) users.delete(uid);
      }
      console.log(`User ${socket.id} disconnected`);
    });
  });
}
