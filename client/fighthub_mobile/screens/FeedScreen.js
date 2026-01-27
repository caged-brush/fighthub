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
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

function ClipCard({ clip, onPress }) {
  const isYoutube = (clip.source_type || "upload") === "youtube";
  const user = clip.users || {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: "#232323",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#333",
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {user.profile_picture_url ? (
          <Image
            source={{ uri: user.profile_picture_url }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
          />
        ) : (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#111",
            }}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            {user.fname || "Unknown"} {user.lname || ""}
          </Text>
          <Text style={{ color: "#777", fontSize: 12 }}>
            {clip.created_at
              ? new Date(clip.created_at).toLocaleDateString()
              : ""}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: "#181818",
            borderWidth: 1,
            borderColor: "#333",
          }}
        >
          <Text style={{ color: "#bbb", fontSize: 12, fontWeight: "800" }}>
            {isYoutube ? "YouTube" : "Upload"}
          </Text>
        </View>
      </View>

      {/* Fight info */}
      <Text style={{ color: "#fff", fontWeight: "900", marginTop: 10 }}>
        {clip.promotion || "—"} {clip.opponent ? `vs ${clip.opponent}` : ""}
      </Text>

      <Text style={{ color: "#bbb", marginTop: 6 }}>
        {clip.fight_date || "—"} • {clip.weight_class || "—"} •{" "}
        {clip.result || "—"}
      </Text>

      {!!clip.notes && (
        <Text style={{ color: "#ddd", marginTop: 10 }} numberOfLines={2}>
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

  const loadFeed = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/fight-clips/feed`, { headers });
      setClips(res.data?.clips || []);
      setNextCursor(res.data?.nextCursor || null);
    } catch (e) {
      console.log("FEED ERROR:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`${API_URL}/fight-clips/feed`, { headers });
      setClips(res.data?.clips || []);
      setNextCursor(res.data?.nextCursor || null);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      const res = await axios.get(
        `${API_URL}/fight-clips/feed?cursor=${encodeURIComponent(nextCursor)}`,
        { headers },
      );

      const newClips = res.data?.clips || [];
      const seen = new Set(clips.map((c) => c.id));

      setClips([...clips, ...newClips.filter((c) => !seen.has(c.id))]);
      setNextCursor(res.data?.nextCursor || null);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userToken) loadFeed();
  }, [userToken]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#181818" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#ffd700", fontSize: 22, fontWeight: "900" }}>
          Fight Feed
        </Text>
        <Text style={{ color: "#777", marginTop: 6 }}>Public fight clips</Text>
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
