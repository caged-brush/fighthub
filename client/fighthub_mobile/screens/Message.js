import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";
import { format } from "date-fns";

const FIGHTHUB_BASE_URL = API_URL;

export default function UserListScreen() {
  const navigation = useNavigation();
  const { userId: authedUserId, userToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);

  const authHeaders = useMemo(() => {
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
  }, [userToken]);

  const fetchInbox = useCallback(async () => {
    if (!userToken) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${FIGHTHUB_BASE_URL}/inbox/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Inbox fetch failed");
      }

      const list = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(list);
    } catch (err) {
      console.log("Inbox fetch failed:", err?.message || err);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, FIGHTHUB_BASE_URL]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInbox();
  }, [fetchInbox]);

  const openChat = (c) => {
    navigation.navigate("ChatScreen", {
      recipientId: c.userId,
      recipientName: c.name || "User",
    });
  };

  const renderItem = ({ item }) => {
    const avatarUri = item?.profile_picture_url
      ? item.profile_picture_url.startsWith("/")
        ? `${FIGHTHUB_BASE_URL}${item.profile_picture_url}`
        : item.profile_picture_url
      : null;

    const ts = item?.lastTimestamp ? new Date(item.lastTimestamp) : null;
    const timeLabel = ts ? format(ts, "p") : "";

    return (
      <TouchableOpacity style={styles.userItem} onPress={() => openChat(item)}>
        <View style={styles.userRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="body-outline" size={32} color="#ffd700" />
            </View>
          )}

          <View style={styles.infoCol}>
            <View style={styles.topRow}>
              <Text style={styles.userText} numberOfLines={1}>
                {item.name || "Unknown"}
              </Text>
              {!!timeLabel && <Text style={styles.timeText}>{timeLabel}</Text>}
            </View>

            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.trim() ? item.lastMessage : "No messages yet."}
            </Text>

            {/* Optional: show role */}
            {!!item.role && (
              <Text style={styles.rolePill}>
                {String(item.role).toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading inbox…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Inbox</Text>

      <FlatList
        style={styles.listContainer}
        data={conversations}
        keyExtractor={(item) => String(item.userId)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No conversations yet. Message someone to start.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181818", padding: 16 },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffd700",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 1,
  },
  listContainer: { marginTop: 10 },

  userRow: { flexDirection: "row", alignItems: "center" },
  userItem: {
    backgroundColor: "#232323",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#e0245e",
    shadowColor: "#e0245e",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: "#ffd700",
    backgroundColor: "#292929",
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: "#292929",
    borderWidth: 2,
    borderColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
  },

  infoCol: { flex: 1, justifyContent: "center" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  userText: {
    flex: 1,
    fontSize: 19,
    color: "#ffd700",
    fontWeight: "bold",
    marginBottom: 2,
    letterSpacing: 0.5,
  },

  timeText: { color: "#bbb", fontWeight: "800" },

  lastMessage: {
    color: "#fff",
    fontSize: 15,
    marginTop: 2,
    maxWidth: 260,
    fontStyle: "italic",
  },

  rolePill: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#333",
    color: "#bbb",
    fontWeight: "900",
    fontSize: 11,
  },

  emptyText: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 16,
    color: "#bbb",
    fontWeight: "700",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#bbb", marginTop: 10 },
});
