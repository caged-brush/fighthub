import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";

const SOCKET_URL = "https://fighthub.onrender.com";

export default function ChatScreen() {
  const route = useRoute();
  const { recipientId, recipientName } = route.params;

  const { userId } = useContext(AuthContext);

  const socketRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const chatKey = useMemo(() => {
    if (!userId || !recipientId) return "";
    return [String(userId), String(recipientId)].sort().join("-");
  }, [userId, recipientId]);

  useEffect(() => {
    if (!userId || !recipientId) return;

    // ✅ create socket per mount
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // ✅ join ONLY when we have userId
      socket.emit("join", String(userId));
      socket.emit("load-messages", {
        userId: String(userId),
        recipientId: String(recipientId),
      });
    });

    socket.on("message-history", (rows) => {
      const formatted = (rows || []).map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: String(msg.sender_id) === String(userId) ? "me" : recipientName,
        timestamp: msg.timestamp,
        _key: `${msg.id}`,
      }));
      setMessages(formatted);
    });

    socket.on("private-message", (msg) => {
      // msg: {id, sender_id, recipient_id, message, timestamp}
      if (!msg) return;

      const s = String(msg.sender_id);
      const r = String(msg.recipient_id);

      const relevant =
        (s === String(userId) && r === String(recipientId)) ||
        (s === String(recipientId) && r === String(userId));

      if (!relevant) return;

      setMessages((prev) => {
        // ✅ de-dupe by id (because sender receives echo)
        if (prev.some((m) => String(m.id) === String(msg.id))) return prev;

        return [
          ...prev,
          {
            id: msg.id,
            text: msg.message,
            sender: s === String(userId) ? "me" : recipientName,
            timestamp: msg.timestamp,
            _key: `${msg.id}`,
          },
        ];
      });
    });

    socket.on("connect_error", (e) => {
      console.log("socket connect_error:", e?.message);
    });

    return () => {
      socket.off("message-history");
      socket.off("private-message");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatKey, userId, recipientId, recipientName]);

  const sendMessage = () => {
    if (!userId || !recipientId) return;
    if (!input.trim()) return;

    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit("private-message", {
      recipientId: String(recipientId),
      message: input.trim(),
      senderId: String(userId),
    });

    // ✅ don’t optimistic add (you already get echoed message back with real id)
    // if you insist on optimistic, you'd need temp ids + reconciliation.
    setInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Ionicons
              name="body-outline"
              size={32}
              color="#ffd700"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.headerText}>Chat with {recipientName}</Text>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => String(item._key ?? item.id)}
            renderItem={({ item }) => (
              <View
                style={{
                  alignItems: item.sender === "me" ? "flex-end" : "flex-start",
                  padding: 5,
                }}
              >
                <View
                  style={
                    item.sender === "me"
                      ? styles.senderBubble
                      : styles.receiverBubble
                  }
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                  <Text style={styles.timestamp}>
                    {item.timestamp
                      ? format(new Date(item.timestamp), "p")
                      : ""}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 12 }}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <Feather
              name="send"
              size={28}
              color="#ffd700"
              onPress={sendMessage}
              style={styles.sendIcon}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#181818" },
  container: { flex: 1, backgroundColor: "#181818", padding: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderColor: "#e0245e",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffd700",
    letterSpacing: 1,
  },
  senderBubble: {
    backgroundColor: "#e0245e",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "80%",
    marginVertical: 4,
  },
  receiverBubble: {
    backgroundColor: "#232323",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "80%",
    marginVertical: 4,
    borderWidth: 2,
    borderColor: "#ffd700",
  },
  messageText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  timestamp: {
    fontSize: 10,
    color: "#ffd700",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: "#232323",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#e0245e",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 10,
    height: 40,
  },
  sendIcon: { marginLeft: 8 },
});
