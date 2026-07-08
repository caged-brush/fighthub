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
  SafeAreaView,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";
import { format, isToday, isYesterday } from "date-fns";

const BASE_URL = API_URL;

// Same corner-accent system used across the app, so a fighter/scout/coach
// role reads consistently whether you're looking at Welcome, Signup, or
// here in the inbox.
const ROLE_ACCENTS = {
  fighter: { solid: "#D6473F", label: "FIGHTER" },
  scout: { solid: "#D9A441", label: "SCOUT" },
  coach: { solid: "#4A7FA7", label: "COACH" },
};

function getRoleAccent(role) {
  const key = String(role || "").toLowerCase();
  return (
    ROLE_ACCENTS[key] || {
      solid: "rgba(245,241,232,0.35)",
      label: String(role || "").toUpperCase(),
    }
  );
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (isToday(date)) return format(date, "p");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

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

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

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

    const timeLabel = formatTimestamp(item?.lastTimestamp);
    const unread = item.unreadCount > 0;
    const roleAccent = getRoleAccent(item?.role);

    const contextLabel = item?.eventTitle
      ? `${item.eventTitle}${item.weightClass ? ` · ${item.weightClass}` : ""}`
      : null;

    return (
      <TouchableOpacity
        style={styles.userItem}
        activeOpacity={0.85}
        onPress={() => openChat(item)}
      >
        <View style={styles.userRow}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color="#E8B84B"
                />
              </View>
            )}
            {unread && <View style={styles.unreadDot} />}
          </View>

          <View style={styles.infoCol}>
            <View style={styles.topRow}>
              <Text
                style={[styles.userText, unread && styles.userTextUnread]}
                numberOfLines={1}
              >
                {item.name || "Unknown"}
              </Text>

              {!!timeLabel && (
                <Text
                  style={[styles.timeText, unread && styles.timeTextUnread]}
                >
                  {timeLabel}
                </Text>
              )}
            </View>

            {!!contextLabel && (
              <Text style={styles.contextText} numberOfLines={1}>
                {contextLabel}
              </Text>
            )}

            <Text
              style={[styles.lastMessage, unread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage?.trim() ? item.lastMessage : "No messages yet."}
            </Text>

            <View style={styles.bottomRow}>
              {!!item.role && (
                <View
                  style={[styles.rolePill, { borderColor: roleAccent.solid }]}
                >
                  <Text
                    style={[styles.rolePillText, { color: roleAccent.solid }]}
                  >
                    {roleAccent.label}
                  </Text>
                </View>
              )}

              {unread && (
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
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E8B84B" />
        <Text style={styles.loadingText}>Loading inbox...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Inbox</Text>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnread} new</Text>
            </View>
          )}
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.threadId || item.userId)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5F1E8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={28}
                color="rgba(245,241,232,0.3)"
              />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Messages tied to fights will appear here once a scout or coach
                reaches out — or once you do.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F5F1E8",
    letterSpacing: -0.4,
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(232,184,75,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,184,75,0.35)",
  },
  headerBadgeText: {
    color: "#E8B84B",
    fontWeight: "800",
    fontSize: 12,
  },

  userItem: {
    backgroundColor: "#151515",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
  },

  userRow: { flexDirection: "row", alignItems: "flex-start" },

  avatarWrap: { marginRight: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1c1c1c",
    borderWidth: 2,
    borderColor: "rgba(232,184,75,0.4)",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1c1c1c",
    borderWidth: 2,
    borderColor: "rgba(232,184,75,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D6473F",
    borderWidth: 2,
    borderColor: "#151515",
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
    fontSize: 15,
    color: "rgba(245,241,232,0.85)",
    fontWeight: "700",
  },
  userTextUnread: {
    color: "#F5F1E8",
    fontWeight: "900",
  },

  timeText: {
    color: "rgba(245,241,232,0.35)",
    fontWeight: "600",
    fontSize: 11,
  },
  timeTextUnread: {
    color: "#E8B84B",
    fontWeight: "800",
  },

  contextText: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  lastMessage: {
    color: "rgba(245,241,232,0.5)",
    fontSize: 13,
    marginTop: 4,
  },
  lastMessageUnread: {
    color: "rgba(245,241,232,0.85)",
    fontWeight: "600",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: {
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D6473F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#F5F1E8",
    fontWeight: "800",
    fontSize: 11,
  },

  emptyWrap: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    color: "#F5F1E8",
    fontWeight: "800",
    fontSize: 15,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(245,241,232,0.45)",
    lineHeight: 19,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0C",
  },
  loadingText: {
    color: "rgba(245,241,232,0.5)",
    marginTop: 10,
  },
});
