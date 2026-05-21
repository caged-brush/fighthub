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

const BASE_URL = API_URL;

export default function UserListScreen() {
  const navigation = useNavigation();
  const { userToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);

  const fetchInbox = useCallback(async () => {
    if (!userToken) {
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/inbox/me`, {
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

      setConversations(
        Array.isArray(data?.conversations) ? data.conversations : [],
      );
    } catch (err) {
      console.log("Inbox fetch failed:", err?.message || err);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInbox();
  }, [fetchInbox]);

  const openChat = (c) => {
    navigation.navigate("ChatScreen", {
      threadId: c.threadId,
      recipientId: c.userId,
      recipientName: c.name || "User",
      applicationId: c.applicationId || null,
      fightSlotId: c.fightSlotId || null,
      eventTitle: c.eventTitle || null,
      promotionName: c.promotionName || null,
      discipline: c.discipline || null,
      weightClass: c.weightClass || null,
    });
  };

  const renderItem = ({ item }) => {
    const avatarUri = item?.profile_picture_url
      ? item.profile_picture_url.startsWith("/")
        ? `${BASE_URL}${item.profile_picture_url}`
        : item.profile_picture_url
      : null;

    const ts = item?.lastTimestamp ? new Date(item.lastTimestamp) : null;
    const timeLabel = ts ? format(ts, "p") : "";

    const contextLabel = item?.eventTitle
      ? `${item.eventTitle}${item.weightClass ? ` • ${item.weightClass}` : ""}`
      : null;

    return (
      <TouchableOpacity style={styles.userItem} onPress={() => openChat(item)}>
        <View style={styles.userRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={28}
                color="#ffd700"
              />
            </View>
          )}

          <View style={styles.infoCol}>
            <View style={styles.topRow}>
              <Text style={styles.userText} numberOfLines={1}>
                {item.name || "Unknown"}
              </Text>

              {!!timeLabel && <Text style={styles.timeText}>{timeLabel}</Text>}
            </View>

            {!!contextLabel && (
              <Text style={styles.contextText} numberOfLines={1}>
                {contextLabel}
              </Text>
            )}

            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.trim() ? item.lastMessage : "No messages yet."}
            </Text>

            <View style={styles.bottomRow}>
              {!!item.role && (
                <Text style={styles.rolePill}>
                  {String(item.role).toUpperCase()}
                </Text>
              )}

              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading inbox...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Inbox</Text>

      <FlatList
        style={styles.listContainer}
        data={conversations}
        keyExtractor={(item) => String(item.threadId || item.userId)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No conversations yet. Messages tied to fights will appear here.
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

  userItem: {
    backgroundColor: "#232323",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#333",
  },

  userRow: { flexDirection: "row", alignItems: "center" },

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

  infoCol: { flex: 1 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  userText: {
    flex: 1,
    fontSize: 18,
    color: "#ffd700",
    fontWeight: "900",
  },

  timeText: {
    color: "#bbb",
    fontWeight: "800",
    fontSize: 12,
  },

  contextText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  lastMessage: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#444",
    color: "#bbb",
    fontWeight: "900",
    fontSize: 11,
  },

  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0245e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  unreadText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  emptyText: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 16,
    color: "#bbb",
    fontWeight: "700",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
  },

  loadingText: {
    color: "#bbb",
    marginTop: 10,
  },
});
