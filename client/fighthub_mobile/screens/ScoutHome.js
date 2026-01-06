import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../Constants";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const WEIGHT_CLASSES = [
  "All",
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
];

const PAGE_SIZE = 20;

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

export default function ScoutHome() {
  const { userToken } = useContext(AuthContext);
  const navigation = useNavigation();

  // UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // filters
  const [weightClass, setWeightClass] = useState("All");
  const [region, setRegion] = useState("");
  const [minWins, setMinWins] = useState("");
  const [style, setStyle] = useState("");

  // data
  const [fighters, setFighters] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // prevent double-fetch storms
  const inFlightRef = useRef(false);

  const [watchSet, setWatchSet] = useState(new Set());

  const buildParams = useCallback(
    (pageOffset) => {
      const params = {
        limit: PAGE_SIZE,
        offset: pageOffset,
      };

      if (weightClass && weightClass !== "All")
        params.weight_class = weightClass;

      const mw = minWins.trim();
      if (mw !== "") params.min_wins = mw;

      const st = style.trim();
      if (st !== "") params.style = st;

      const rg = region.trim();
      if (rg !== "") params.region = rg;

      return params;
    },
    [weightClass, minWins, style, region]
  );

  const fetchPage = useCallback(
    async ({ pageOffset, mode }) => {
      // mode: "replace" | "append"
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const params = buildParams(pageOffset);
        const res = await axios.get(`${API_URL}/fighters/search`, { params });

        const list = Array.isArray(res.data) ? res.data : [];

        // detect end
        const noMore = list.length < PAGE_SIZE;
        setHasMore(!noMore);

        if (mode === "replace") {
          setFighters(list);
          setOffset(pageOffset + list.length);
        } else {
          // de-dupe by user_id (protect against weird paging)
          setFighters((prev) => {
            const seen = new Set(prev.map((x) => x.user_id));
            const merged = [...prev];
            for (const item of list) {
              if (!seen.has(item.user_id)) merged.push(item);
            }
            return merged;
          });
          setOffset((prev) => prev + list.length);
        }
      } catch (err) {
        console.error(
          "ScoutHome fetch error:",
          err?.response?.data || err?.message || err
        );
        Alert.alert("Error", "Failed to load fighters. Try again.");
      } finally {
        inFlightRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [buildParams]
  );

  // initial load
  useEffect(() => {
    fetchPage({ pageOffset: 0, mode: "replace" });
  }, [fetchPage]);

  const ranked = useMemo(() => {
    // No fake region filtering here. Region is server-side now.
    return fighters
      .map((f) => ({ ...f, _score: calcScore(f) }))
      .sort((a, b) => b._score - a._score);
  }, [fighters]);

  const applyFilters = useCallback(() => {
    // hard reset paging and replace list
    setHasMore(true);
    setOffset(0);
    setInitialLoading(true);
    fetchPage({ pageOffset: 0, mode: "replace" });
  }, [fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    setOffset(0);
    fetchPage({ pageOffset: 0, mode: "replace" });
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    if (loadingMore) return;
    if (refreshing) return;
    if (initialLoading) return;

    setLoadingMore(true);
    fetchPage({ pageOffset: offset, mode: "append" });
  }, [hasMore, loadingMore, refreshing, initialLoading, fetchPage, offset]);

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

  const renderWeightPills = () => (
    <View style={styles.pillsRow}>
      {WEIGHT_CLASSES.map((wc) => {
        const active = wc === weightClass;
        return (
          <TouchableOpacity
            key={wc}
            onPress={() => setWeightClass(wc)}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {wc}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const authHeaders = useMemo(() => {
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
  }, [userToken]);

  const loadWatchlistIds = useCallback(async () => {
    if (!userToken) return;

    const res = await axios.get(`${API_URL}/scouts/watchlist`, {
      headers: authHeaders,
    });

    const ids = new Set((res.data?.watchlist || []).map((f) => f.user_id));
    setWatchSet(ids);
  }, [userToken, authHeaders]);

  useEffect(() => {
    loadWatchlistIds();
  }, [loadWatchlistIds]);

  const toggleWatch = async (fighterId) => {
    if (!userToken) return;

    const isSaved = watchSet.has(fighterId);

    // optimistic UI
    setWatchSet((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(fighterId);
      else next.add(fighterId);
      return next;
    });

    try {
      if (isSaved) {
        await axios.delete(`${API_URL}/scouts/watchlist/${fighterId}`, {
          headers: authHeaders,
        });
      } else {
        await axios.post(
          `${API_URL}/scouts/watchlist/${fighterId}`,
          {},
          { headers: authHeaders }
        );
      }
    } catch (e) {
      // rollback if API failed
      setWatchSet((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(fighterId);
        else next.delete(fighterId);
        return next;
      });

      Alert.alert("Error", "Watchlist update failed.");
    }
  };

  const renderItem = ({ item }) => {
    const name =
      `${item?.users?.fname || ""} ${item?.users?.lname || ""}`.trim() ||
      "Unknown Fighter";

    const record = `${item?.wins ?? 0}-${item?.losses ?? 0}-${
      item?.draws ?? 0
    }`;
    const wc = item?.weight_class || "—";
    const styleText = (item?.fight_style || "").trim() || "—";
    const regionText = (item?.users?.region || "").trim() || "—";
    const saved = watchSet.has(item.user_id);

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => toggleWatch(item.user_id)}
            style={[styles.starBtn, saved && styles.starBtnActive]}
          >
            <Text style={[styles.starText, saved && styles.starTextActive]}>
              {saved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>

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
        </View>
      </View>
    );
  };

  const ListHeader = useMemo(() => {
    return (
      <View>
        <Text style={styles.header}>Scout Home</Text>
        <Text style={styles.subheader}>Find bookable fighters fast.</Text>

        {renderWeightPills()}

        <View style={styles.filters}>
          <View style={styles.filterCol}>
            <Text style={styles.label}>Min wins</Text>
            <TextInput
              value={minWins}
              onChangeText={setMinWins}
              placeholder="e.g. 3"
              placeholderTextColor="#777"
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.filterCol}>
            <Text style={styles.label}>Style</Text>
            <TextInput
              value={style}
              onChangeText={setStyle}
              placeholder="e.g. wrestling"
              placeholderTextColor="#777"
              style={styles.input}
            />
          </View>

          <View style={styles.filterCol}>
            <Text style={styles.label}>Region</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. Vancouver"
              placeholderTextColor="#777"
              style={styles.input}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    );
  }, [minWins, style, region, weightClass, applyFilters]); // include deps

  const ListFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading fighters…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={ranked}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        removeClippedSubviews={false}
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.empty}>No fighters found. Loosen filters.</Text>
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
    paddingBottom: 4,
  },
  subheader: {
    color: "#bbb",
    paddingBottom: 10,
  },

  pillsRow: {
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillActive: { borderColor: "#e0245e" },
  pillText: { color: "#ccc", fontWeight: "700" },
  pillTextActive: { color: "#fff" },

  filters: { gap: 10, paddingTop: 6 },
  filterCol: { marginTop: 8 },
  label: { color: "#ffd700", fontWeight: "800", marginBottom: 6 },

  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#e0245e",
  },

  applyBtn: {
    marginTop: 12,
    backgroundColor: "#e0245e",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

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

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#bbb", marginTop: 10 },

  empty: { color: "#bbb", textAlign: "center" },

  footer: { paddingVertical: 14, alignItems: "center", gap: 8 },
  footerText: { color: "#bbb", fontWeight: "700" },

  starBtn: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1c1c",
  },
  starBtnActive: {
    borderColor: "#ffd700",
  },
  starText: {
    color: "#bbb",
    fontSize: 18,
    fontWeight: "900",
  },
  starTextActive: {
    color: "#ffd700",
  },
});
