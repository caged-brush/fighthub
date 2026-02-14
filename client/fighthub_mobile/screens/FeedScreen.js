import React, { useEffect, useState, useContext } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import { apiGet } from "../lib/apiGet";

function ClipCard({ clip, onPress }) {
  const isYoutube = (clip.source_type || "upload") === "youtube";
  const user = clip.users || {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        {user.profile_picture_url ? (
          <Image
            source={{ uri: user.profile_picture_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {user.fname || "Unknown"} {user.lname || ""}
          </Text>
          <Text style={styles.date}>
            {clip.created_at
              ? new Date(clip.created_at).toLocaleDateString()
              : ""}
          </Text>
        </View>

        <View style={styles.sourcePill}>
          <Text style={styles.sourceText}>
            {isYoutube ? "YOUTUBE" : "UPLOAD"}
          </Text>
        </View>
      </View>

      {/* Fight title */}
      <Text style={styles.fightTitle}>
        {clip.promotion || "—"}
        {clip.opponent ? ` vs ${clip.opponent}` : ""}
      </Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{clip.fight_date || "—"}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.metaText}>{clip.weight_class || "—"}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.metaResult}>{clip.result || "—"}</Text>
      </View>

      {/* Notes */}
      {!!clip.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {clip.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function FeedScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);

  const [clips, setClips] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const headers = { Authorization: `Bearer ${userToken}` };

  const loadFeedCore = async () => {
    const data = await apiGet(`${API_URL}/fight-clips/feed`, {
      token: userToken,
    });
    setClips(data?.clips || []);
    setNextCursor(data?.nextCursor || null);
  };

  const loadFeed = async () => {
    try {
      setLoading(true);
      await loadFeedCore();
    } catch (e) {
      console.log("FEED ERROR:", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      await loadFeedCore();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);

      const data = await apiGet(
        `${API_URL}/fight-clips/feed?cursor=${encodeURIComponent(nextCursor)}`,
        { token: userToken },
      );

      const newClips = data?.clips || [];
      const newCursor = data?.nextCursor || null;

      setClips((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const c of newClips) {
          if (!seen.has(c.id)) merged.push(c);
        }
        return merged;
      });

      setNextCursor(newCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userToken) loadFeed();
  }, [userToken]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#181818" }}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Fight Feed</Text>
        <Text style={styles.feedSubtitle}>
          Public clips from fighters on Kavyx
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#ffd700" />
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <ClipCard
              clip={item}
              onPress={() => navigation.navigate("ClipViewer", { clip: item })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#ffd700"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color="#ffd700" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ color: "#bbb", textAlign: "center", marginTop: 40 }}>
              No public clips yet.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = {
  /* Screen */
  feedHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  feedTitle: {
    color: "#ffd700",
    fontSize: 22,
    fontWeight: "900",
  },
  feedSubtitle: {
    color: "rgba(255,255,255,0.55)",
    marginTop: 6,
    fontSize: 13,
  },

  /* Card */
  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
  },

  name: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  date: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 2,
  },

  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sourceText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  fightTitle: {
    marginTop: 12,
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "700",
  },
  metaResult: {
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "900",
  },
  dot: {
    color: "rgba(255,255,255,0.35)",
    fontWeight: "900",
  },

  notes: {
    marginTop: 10,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 18,
  },
};
