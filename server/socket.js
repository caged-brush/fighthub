export default function setupSocket(io, db) {
  const users = new Map();

  io.on("connection", (socket) => {
    console.log(`User ${socket.id} connected`);

    socket.on("join", async (userId) => {
      if (!users.has(userId)) {
        users.set(userId, new Set());
      }
      users.get(userId).add(socket.id);
      console.log(`User ${userId} registered with socket id ${socket.id}`);

      // Fetch users from the database
      try {
        const result = await db.query("SELECT * FROM users");
        const userList = result.rows.map((user) => ({
          id: user.id,
          name: user.fname + " " + user.lname,
        }));

        io.emit(
          "users",
          userList.filter((user) => user.id !== userId)
        );
      } catch (error) {
        console.error("Error fetching users from database:", error);
      }
    });

    socket.on("load-messages", async ({ userId, recipientId }) => {
      try {
        const result = await db.query(
          `SELECT * FROM messages WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id =$1) ORDER BY timestamp ASC`,
          [userId, recipientId]
        );
        io.to(socket.id).emit("message-history", result.rows);
      } catch (err) {
        console.error("Error loading messaging history:", err);
      }
    });

    socket.on("private-message", async ({ recipientId, message, senderId }) => {
      let savedMessage;
      try {
        const result = await db.query(
          "INSERT INTO messages (sender_id,recipient_id,message) VALUES ($1,$2,$3) RETURNING id, message, sender_id, timestamp",
          [senderId, recipientId, message]
        );
        savedMessage = result.rows[0];
      } catch (err) {
        console.error("Error saving message to DB:", err);
        return;
      }

      const payload = {
        id: savedMessage.id,
        message: savedMessage.message,
        senderId: savedMessage.sender_id,
        timestamp: savedMessage.timestamp,
      };

      const recipientSockets = users.get(recipientId);
      if (recipientSockets) {
        for (const socketId of recipientSockets) {
          io.to(socketId).emit("private-message", payload);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
      for (const [userId, socketSet] of users.entries()) {
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          users.delete(userId);
        }
      }
    });
  });
}
