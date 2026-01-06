import React, { useCallback, useEffect, useMemo, useState } from "react";
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

function calcScore(f) {
  // Simple, good-enough ranking for v1.
  // You can replace later with something smarter.
  const wins = Number(f?.wins ?? 0);
  const losses = Number(f?.losses ?? 0);
  const draws = Number(f?.draws ?? 0);
  const hasStyle = (f?.fight_style || "").trim().length > 0;
  const hasWeightClass = (f?.weight_class || "").trim().length > 0;
  const hasWeight = f?.weight != null;
  const hasHeight = f?.height != null;

  // reward wins, penalize losses, reward profile completeness
  const completion =
    (hasStyle ? 1 : 0) +
    (hasWeightClass ? 1 : 0) +
    (hasWeight ? 1 : 0) +
    (hasHeight ? 1 : 0);

  return wins * 3 - losses * 1 + draws * 0.5 + completion * 2;
}

export default function ScoutHome() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [weightClass, setWeightClass] = useState("All");
  const [region, setRegion] = useState(""); // not wired server-side in your /fighters/search yet
  const [minWins, setMinWins] = useState("");
  const [style, setStyle] = useState("");

  const [fighters, setFighters] = useState([]);

  const fetchFighters = useCallback(async () => {
    try {
      // Server supports: weight_class, min_wins, style, limit, offset
      // NOTE: your backend route currently ignores `region` (not implemented).
      const params = {
        limit: 50,
        offset: 0,
      };

      if (weightClass && weightClass !== "All")
        params.weight_class = weightClass;
      if (minWins.trim() !== "") params.min_wins = minWins.trim();
      if (style.trim() !== "") params.style = style.trim();

      const res = await axios.get(`${API_URL}/fighters/search`, { params });

      const list = Array.isArray(res.data) ? res.data : [];
      setFighters(list);
    } catch (err) {
      console.error(
        "ScoutHome fetch error:",
        err?.response?.data || err?.message || err
      );
      Alert.alert(
        "Error",
        "Failed to load fighters. Check your server and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [minWins, style, weightClass]);

  useEffect(() => {
    fetchFighters();
  }, [fetchFighters]);

  const ranked = useMemo(() => {
    // Region filter is client-side placeholder until you add region to fighters/users
    const regionQuery = region.trim().toLowerCase();

    const filtered = fighters.filter((f) => {
      if (!regionQuery) return true;

      // If you later add users.region or fighters.region, update this.
      // Right now we have no region data in the payload, so this does nothing meaningful.
      const name = `${f?.users?.fname || ""} ${
        f?.users?.lname || ""
      }`.toLowerCase();
      return name.includes(regionQuery);
    });

    return filtered
      .map((f) => ({ ...f, _score: calcScore(f) }))
      .sort((a, b) => b._score - a._score);
  }, [fighters, region]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFighters();
  }, [fetchFighters]);

  const openProfile = (fighter) => {
    // Adjust param name to what your UserProfile screen expects.
    navigation.navigate("UserProfile", { userId: fighter.user_id });
  };

  const messageFighter = (fighter) => {
    const recipientId = fighter.user_id;
    const recipientName =
      `${fighter?.users?.fname || ""} ${fighter?.users?.lname || ""}`.trim() ||
      "Fighter";

    // Your ChatScreen title uses route.params?.recipientName
    navigation.navigate("ChatScreen", { recipientId, recipientName });
  };

  const renderWeightPills = () => {
    return (
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

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>

          <Text style={styles.meta}>
            {wc} • Record {record} • Score {item._score.toFixed(1)}
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading fighters…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
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
          <Text style={styles.label}>Region (v1)</Text>
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="(client-only filter)"
            placeholderTextColor="#777"
            style={styles.input}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.applyBtn} onPress={fetchFighters}>
        <Text style={styles.applyBtnText}>Apply Filters</Text>
      </TouchableOpacity>

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
    paddingHorizontal: 16,
  },
  subheader: {
    color: "#bbb",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  pillsRow: {
    paddingHorizontal: 12,
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
  pillActive: {
    borderColor: "#e0245e",
  },
  pillText: { color: "#ccc", fontWeight: "700" },
  pillTextActive: { color: "#fff" },

  filters: {
    paddingHorizontal: 16,
    gap: 10,
  },
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
    marginHorizontal: 16,
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

  cardActions: {
    justifyContent: "center",
    gap: 8,
  },
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
});
