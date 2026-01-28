// socket.js
import jwt from "jsonwebtoken";

export default function setupSocket(io, supabase) {
  // Map<userIdString, Set<socketId>>
  const users = new Map();
  const norm = (v) => String(v ?? "").trim();

  // ✅ Require JWT auth on socket connection
  io.use((socket, next) => {
    const raw = socket.handshake?.auth?.token;

    // Log only safe metadata
    console.log("[socket auth] hasToken=", !!raw, "len=", raw?.length);
    console.log("[socket auth] hasSecret=", !!process.env.JWT_SECRET);

    if (!raw) return next(new Error("unauthorized:missing_token"));

    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

    if (!process.env.JWT_SECRET) {
      return next(new Error("unauthorized:missing_server_secret"));
    }

    try {
      const decoded = jwt.decode(token);
      console.log(
        "[socket auth] decoded keys:",
        decoded ? Object.keys(decoded) : null,
      );
      console.log("[socket auth] decoded exp:", decoded?.exp);

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const uid = String(
        payload?.id || payload?.userId || payload?.sub || "",
      ).trim();
      if (!uid) return next(new Error("unauthorized:missing_uid_claim"));

      socket.data.userId = uid;
      return next();
    } catch (e) {
      console.log("[socket auth] verify error:", e?.name, e?.message);
      return next(new Error(`unauthorized:${e?.name || "verify_failed"}`));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    console.log(`Socket connected: ${socket.id} user=${uid}`);

    // register
    if (!users.has(uid)) users.set(uid, new Set());
    users.get(uid).add(socket.id);

    socket.on("load-messages", async ({ recipientId }) => {
      const rid = norm(recipientId);
      if (!rid) return;

      try {
        // messages between authed uid and rid
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, message, timestamp")
          .or(
            `and(sender_id.eq.${uid},recipient_id.eq.${rid}),and(sender_id.eq.${rid},recipient_id.eq.${uid})`,
          )
          .order("timestamp", { ascending: true });

        if (error) throw error;

        io.to(socket.id).emit("message-history", data || []);
      } catch (err) {
        console.error("Error loading message history:", err?.message || err);
      }
    });

    socket.on("private-message", async ({ recipientId, message }) => {
      const rid = norm(recipientId);
      const msg = typeof message === "string" ? message.trim() : "";
      if (!rid || !msg) return;

      // ✅ senderId is ALWAYS the authed socket user
      const sid = uid;

      let saved;
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert([{ sender_id: sid, recipient_id: rid, message: msg }])
          .select("id, sender_id, recipient_id, message, timestamp")
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
        timestamp: saved.timestamp,
      };

      // send to recipient sockets
      const recipientSockets = users.get(rid);
      if (recipientSockets) {
        for (const socketId of recipientSockets) {
          io.to(socketId).emit("private-message", payload);
        }
      }

      // echo back to sender sockets (multi-device)
      const senderSockets = users.get(sid);
      if (senderSockets) {
        for (const socketId of senderSockets) {
          io.to(socketId).emit("private-message", payload);
        }
      }
    });

    socket.on("disconnect", () => {
      if (users.has(uid)) {
        const set = users.get(uid);
        set.delete(socket.id);
        if (set.size === 0) users.delete(uid);
      }
      console.log(`Socket disconnected: ${socket.id} user=${uid}`);
    });
  });
}
