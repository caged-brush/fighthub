import React, { useEffect, useState, useContext, useCallback } from "react";
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
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { API_URL } from "../Constants";

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const {
    threadId: initialThreadId,
    recipientId,
    recipientName,
    applicationId,
    fightSlotId,
    eventTitle,
    promotionName,
    discipline,
    weightClass,
  } = route.params || {};

  const { userId: authedUserId, userToken } = useContext(AuthContext);

  const userId = String(authedUserId || "");
  const rid = String(recipientId || "");

  const [threadId, setThreadId] = useState(initialThreadId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const parseJson = async (res) => {
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Server returned non-JSON response (${res.status})`);
    }

    if (!res.ok) {
      throw new Error(
        data?.message || data?.error || `Request failed (${res.status})`,
      );
    }

    return data;
  };

  const authHeaders = {
    Authorization: `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };

  const ensureThread = useCallback(async () => {
    if (threadId) return threadId;

    if (!userToken || !rid) {
      throw new Error("Missing thread or recipient.");
    }

    const res = await fetch(`${API_URL}/inbox/threads`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        recipient_id: rid,
        application_id: applicationId || null,
        fight_slot_id: fightSlotId || null,
      }),
    });

    const data = await parseJson(res);
    const createdThreadId = data?.thread?.id;

    if (!createdThreadId) {
      throw new Error("Failed to create chat thread.");
    }

    setThreadId(createdThreadId);
    return createdThreadId;
  }, [threadId, userToken, rid, applicationId, fightSlotId]);

  const loadMessages = useCallback(async () => {
    if (!userToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const activeThreadId = await ensureThread();

      const res = await fetch(
        `${API_URL}/inbox/threads/${activeThreadId}/messages`,
        {
          method: "GET",
          headers: authHeaders,
        },
      );

      const data = await parseJson(res);
      const rows = Array.isArray(data?.messages) ? data.messages : [];

      const formatted = rows.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: String(msg.sender_id) === userId ? "me" : "them",
        timestamp: msg.timestamp,
      }));

      setMessages(formatted);

      await fetch(`${API_URL}/inbox/threads/${activeThreadId}/read`, {
        method: "POST",
        headers: authHeaders,
      });
    } catch (e) {
      console.log("Load chat messages error:", e?.message || e);
      Alert.alert("Chat error", e?.message || "Failed to load chat.");
    } finally {
      setLoading(false);
    }
  }, [userToken, ensureThread, userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    try {
      setSending(true);

      const activeThreadId = await ensureThread();

      const res = await fetch(
        `${API_URL}/inbox/threads/${activeThreadId}/messages`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ message: msg }),
        },
      );

      const data = await parseJson(res);
      const saved = data?.message;

      if (!saved) {
        throw new Error("Message was not saved.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: saved.id,
          text: saved.message,
          sender: "me",
          timestamp: saved.timestamp,
        },
      ]);

      setInput("");
    } catch (e) {
      console.log("Send message error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const contextLabel = eventTitle
    ? `${eventTitle}${weightClass ? ` • ${weightClass}` : ""}`
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color="#ffd700" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerText} numberOfLines={1}>
                {recipientName || "User"}
              </Text>

              {contextLabel ? (
                <Text style={styles.contextText} numberOfLines={1}>
                  {contextLabel}
                </Text>
              ) : (
                <Text style={styles.contextText} numberOfLines={1}>
                  Direct message
                </Text>
              )}

              {promotionName ? (
                <Text style={styles.smallContextText} numberOfLines={1}>
                  {promotionName}
                  {discipline ? ` • ${String(discipline).toUpperCase()}` : ""}
                </Text>
              ) : null}
            </View>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View
                style={{
                  alignItems: item.sender === "me" ? "flex-end" : "flex-start",
                  paddingVertical: 4,
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
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  No messages yet. Start the conversation.
                </Text>
              </View>
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              style={styles.input}
              multiline
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending || !input.trim()}
              style={[
                styles.sendBtn,
                (sending || !input.trim()) && styles.disabledBtn,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#0b0b0b" />
              ) : (
                <Feather name="send" size={22} color="#0b0b0b" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#181818" },

  container: {
    flex: 1,
    backgroundColor: "#181818",
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  center: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#bbb",
    marginTop: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#333",
  },

  backBtn: {
    marginRight: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#232323",
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffd700",
  },

  contextText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  smallContextText: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
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
    marginVertical: 2,
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
    marginVertical: 2,
    borderWidth: 1,
    borderColor: "#ffd700",
  },

  messageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },

  timestamp: {
    fontSize: 10,
    color: "#ffd700",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#232323",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 10,
    maxHeight: 110,
  },

  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffd700",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  disabledBtn: {
    opacity: 0.45,
  },

  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
  },

  emptyText: {
    color: "#aaa",
    textAlign: "center",
    fontWeight: "700",
  },
});
