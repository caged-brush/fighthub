// socket.js
export default function setupSocket(io, supabase) {
  if (!supabase) throw new Error("setupSocket(io, supabase) missing supabase");

  // userId -> Set(socketId)
  const users = new Map();

  const addSocketForUser = (userId, socketId) => {
    const key = String(userId);
    if (!users.has(key)) users.set(key, new Set());
    users.get(key).add(socketId);
  };

  const removeSocketEverywhere = (socketId) => {
    for (const [userId, socketSet] of users.entries()) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) users.delete(userId);
    }
  };

  const emitToUser = (userId, event, payload) => {
    const socketSet = users.get(String(userId));
    if (!socketSet) return;
    for (const sid of socketSet) io.to(sid).emit(event, payload);
  };

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", async (userId) => {
      if (!userId) {
        console.log("join ignored (missing userId) for socket:", socket.id);
        return;
      }

      addSocketForUser(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);

      // optional: users list (only if you actually use this)
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, fname, lname");

        if (error) throw error;

        const userList = (data || []).map((u) => ({
          id: u.id,
          name: `${u.fname || ""} ${u.lname || ""}`.trim(),
        }));

        io.to(socket.id).emit(
          "users",
          userList.filter((u) => String(u.id) !== String(userId))
        );
      } catch (e) {
        console.error("Error fetching users:", e?.message || e);
      }
    });

    socket.on("load-messages", async ({ userId, recipientId }) => {
      if (!userId || !recipientId) return;

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, message, timestamp")
          .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`
          )
          .order("timestamp", { ascending: true });

        if (error) throw error;

        io.to(socket.id).emit("message-history", data || []);
      } catch (e) {
        console.error("Error loading history:", e?.message || e);
      }
    });

    socket.on("private-message", async ({ recipientId, message, senderId }) => {
      if (!recipientId || !senderId || !message?.trim()) return;

      try {
        const { data, error } = await supabase
          .from("messages")
          .insert([
            {
              sender_id: senderId,
              recipient_id: recipientId,
              message: message.trim(),
            },
          ])
          .select("id, sender_id, recipient_id, message, timestamp")
          .single();

        if (error) throw error;

        // deliver to both sides
        emitToUser(recipientId, "private-message", data);
        emitToUser(senderId, "private-message", data);
      } catch (e) {
        console.error("Error saving message:", e?.message || e);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      removeSocketEverywhere(socket.id);
    });
  });
}
