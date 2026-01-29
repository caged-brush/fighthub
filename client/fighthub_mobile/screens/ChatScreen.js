// ChatScreen.js
import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";

export default function ChatScreen() {
  const route = useRoute();
  const { recipientId, recipientName } = route.params || {};

  const { userId: authedUserId, userToken } = useContext(AuthContext);

  const userId = String(authedUserId || "");
  const rid = String(recipientId || "");

  //console.log("userToken exists?", !!userToken, "len=", userToken?.length);

  const socket = useMemo(() => {
    // ✅ auth token sent in handshake
    return io("https://fighthub.onrender.com", {
      transports: ["websocket"],
      reconnection: true,
      auth: { token: userToken },
    });
  }, [userToken]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!userId || !rid || !userToken) return;

    const onConnectError = (err) => {
      console.log("SOCKET connect_error:", err?.message || err);
      Alert.alert("Chat error", "Could not connect to chat. Please try again.");
    };

    const onHistory = (rows) => {
      const formatted = (rows || []).map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: String(msg.sender_id) === userId ? "me" : "them",
        timestamp: msg.timestamp,
      }));
      setMessages(formatted);
    };

    const onPrivate = (p) => {
      const sid = String(p.senderId);
      const pr = String(p.recipientId);

      const isThisChat =
        (sid === userId && pr === rid) || (sid === rid && pr === userId);

      if (!isThisChat) return;

      setMessages((prev) => [
        ...prev,
        {
          id: p.id || Date.now(),
          text: p.message,
          sender: sid === userId ? "me" : "them",
          timestamp: p.timestamp,
        },
      ]);
    };

    socket.on("connect_error", onConnectError);
    socket.on("message-history", onHistory);
    socket.on("private-message", onPrivate);

    // ✅ server knows who you are from token, so only send recipientId
    socket.emit("load-messages", { recipientId: rid });

    return () => {
      socket.off("connect_error", onConnectError);
      socket.off("message-history", onHistory);
      socket.off("private-message", onPrivate);
      socket.disconnect();
    };
  }, [socket, userId, rid, userToken]);

  const sendMessage = () => {
    const msg = input.trim();
    if (!msg) return;

    // ✅ do NOT send senderId
    socket.emit("private-message", {
      recipientId: rid,
      message: msg,
    });

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
              name="chatbubbles-outline"
              size={28}
              color="#ffd700"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.headerText}>
              Chat with {recipientName || "User"}
            </Text>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => String(item.id)}
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffd700",
    letterSpacing: 0.3,
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
