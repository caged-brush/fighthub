import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../Constants";
import { AuthContext } from "../context/AuthContext";

function calcScore(f) {
  const wins = Number(f?.wins ?? 0);
  const losses = Number(f?.losses ?? 0);
  const draws = Number(f?.draws ?? 0);

  const hasStyle = (f?.fight_style || "").trim().length > 0;
  const hasWeightClass = (f?.weight_class || "").trim().length > 0;
  const hasWeight = f?.weight != null;
  const hasHeight = f?.height != null;

  const completion =
    (hasStyle ? 1 : 0) +
    (hasWeightClass ? 1 : 0) +
    (hasWeight ? 1 : 0) +
    (hasHeight ? 1 : 0);

  return wins * 3 - losses * 1 + draws * 0.5 + completion * 2;
}

export default function ScoutWatchlist() {
  const navigation = useNavigation();
  const { userToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [watchlist, setWatchlist] = useState([]);

  const authHeaders = useMemo(() => {
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
  }, [userToken]);

  const fetchWatchlist = useCallback(async () => {
    if (!userToken) return;

    try {
      const res = await axios.get(`${API_URL}/scouts/watchlist`, {
        headers: authHeaders,
      });

      const list = Array.isArray(res.data?.watchlist) ? res.data.watchlist : [];
      setWatchlist(list);
    } catch (e) {
      console.error(
        "GET /scouts/watchlist error:",
        e?.response?.data || e?.message || e
      );
      Alert.alert("Error", "Failed to load watchlist.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, authHeaders]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWatchlist();
  }, [fetchWatchlist]);

  const removeFromWatchlist = async (fighterId) => {
    if (!userToken) return;

    // optimistic remove
    const prev = watchlist;
    setWatchlist((cur) => cur.filter((f) => f.user_id !== fighterId));

    try {
      await axios.delete(`${API_URL}/scouts/watchlist/${fighterId}`, {
        headers: authHeaders,
      });
    } catch (e) {
      setWatchlist(prev); // rollback
      Alert.alert("Error", "Failed to remove from watchlist.");
    }
  };

  const openProfile = (fighter) => {
    navigation.navigate("UserProfile", { userId: fighter.user_id });
  };

  const messageFighter = (fighter) => {
    const recipientId = fighter.user_id;
    const recipientName =
      `${fighter?.users?.fname || ""} ${fighter?.users?.lname || ""}`.trim() ||
      "Fighter";
    navigation.navigate("ChatScreen", { recipientId, recipientName });
  };

  const ranked = useMemo(() => {
    return watchlist
      .map((f) => ({ ...f, _score: calcScore(f) }))
      .sort((a, b) => b._score - a._score);
  }, [watchlist]);

  const renderItem = ({ item }) => {
    const name =
      `${item?.users?.fname || ""} ${item?.users?.lname || ""}`.trim() ||
      "Unknown Fighter";
    const regionText = (item?.users?.region || "").trim() || "—";
    const record = `${item?.wins ?? 0}-${item?.losses ?? 0}-${
      item?.draws ?? 0
    }`;
    const wc = item?.weight_class || "—";
    const styleText = (item?.fight_style || "").trim() || "—";

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {wc} • {regionText} • Record {record} • Score{" "}
            {item._score.toFixed(1)}
          </Text>
          <Text style={styles.metaSmall}>Style: {styleText}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => openProfile(item)}
            style={styles.btnGhost}
          >
            <Text style={styles.btnGhostText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => messageFighter(item)}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => removeFromWatchlist(item.user_id)}
            style={styles.btnDanger}
          >
            <Text style={styles.btnDangerText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading watchlist…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Text style={styles.header}>Watchlist</Text>
      <Text style={styles.subheader}>Saved fighters you want to track.</Text>

      <FlatList
        data={ranked}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.empty}>
              No saved fighters yet. Go to Scout Home and star some fighters.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#181818" },

  header: {
    color: "#ffd700",
    fontSize: 26,
    fontWeight: "900",
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  subheader: {
    color: "#bbb",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  card: {
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },
  name: { color: "#fff", fontSize: 18, fontWeight: "900" },
  meta: { color: "#bbb", marginTop: 4, fontWeight: "700" },
  metaSmall: { color: "#888", marginTop: 6 },

  cardActions: { justifyContent: "center", gap: 8 },

  btnGhost: {
    borderWidth: 1,
    borderColor: "#ffd700",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  btnGhostText: { color: "#ffd700", fontWeight: "900" },

  btnPrimary: {
    backgroundColor: "#ffd700",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  btnPrimaryText: { color: "#181818", fontWeight: "900" },

  btnDanger: {
    borderWidth: 1,
    borderColor: "#e0245e",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  btnDangerText: { color: "#e0245e", fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#bbb", marginTop: 10 },

  empty: { color: "#bbb", textAlign: "center" },
});
