// setupSocket.js
export default function setupSocket(io, db) {
  if (!db) {
    throw new Error("setupSocket(io, db) called without db");
  }

  // userId -> Set(socketId)
  const users = new Map();

  const addSocketForUser = (userId, socketId) => {
    if (!users.has(userId)) users.set(userId, new Set());
    users.get(userId).add(socketId);
  };

  const removeSocketEverywhere = (socketId) => {
    for (const [userId, socketSet] of users.entries()) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) users.delete(userId);
    }
  };

  const emitToUser = (userId, event, payload) => {
    const socketSet = users.get(userId);
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

      addSocketForUser(String(userId), socket.id);
      console.log(`User ${userId} registered with socket id ${socket.id}`);

      // Optional: send users list
      try {
        const result = await db.query("SELECT id, fname, lname FROM users");
        const userList = result.rows.map((u) => ({
          id: u.id,
          name: `${u.fname} ${u.lname}`.trim(),
        }));

        io.to(socket.id).emit(
          "users",
          userList.filter((u) => String(u.id) !== String(userId))
        );
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    });

    socket.on("load-messages", async ({ userId, recipientId }) => {
      if (!userId || !recipientId) return;

      try {
        const result = await db.query(
          `
          SELECT id, sender_id, recipient_id, message, timestamp
          FROM messages
          WHERE (sender_id = $1 AND recipient_id = $2)
             OR (sender_id = $2 AND recipient_id = $1)
          ORDER BY timestamp ASC
        `,
          [userId, recipientId]
        );

        io.to(socket.id).emit("message-history", result.rows);
      } catch (err) {
        console.error("Error loading message history:", err);
      }
    });

    socket.on("private-message", async ({ recipientId, message, senderId }) => {
      if (!recipientId || !senderId || !message?.trim()) return;

      let saved;
      try {
        const result = await db.query(
          `
          INSERT INTO messages (sender_id, recipient_id, message)
          VALUES ($1, $2, $3)
          RETURNING id, sender_id, recipient_id, message, timestamp
        `,
          [senderId, recipientId, message.trim()]
        );
        saved = result.rows[0];
      } catch (err) {
        console.error("Error saving message:", err);
        return;
      }

      // ✅ consistent payload
      const payload = {
        id: saved.id,
        sender_id: saved.sender_id,
        recipient_id: saved.recipient_id,
        message: saved.message,
        timestamp: saved.timestamp,
      };

      // ✅ deliver to recipient + sender
      emitToUser(String(recipientId), "private-message", payload);
      emitToUser(String(senderId), "private-message", payload);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      removeSocketEverywhere(socket.id);
    });
  });
}
