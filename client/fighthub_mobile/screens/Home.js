import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../lib/apiFetch";

export default function FightsHome({ navigation }) {
  const { userToken, role } = useContext(AuthContext);
  const token = userToken;

  const [items, setItems] = useState([]); // [{slot, event}]
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const load = async ({ reset = false } = {}) => {
    if (!token) return;
    if (loading) return;
    if (!reset && !hasMore) return;

    setLoading(true);
    try {
      const cursorParam =
        !reset && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : "";
      const res = await apiFetch(`/fights/open-slots?limit=20${cursorParam}`, {
        token,
      });

      const newItems = res?.slots || [];
      const newCursor = res?.nextCursor ?? null;

      if (reset) {
        setItems(newItems);
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.slot.id));
          const unique = newItems.filter((x) => !seen.has(x.slot.id));
          return [...prev, ...unique];
        });
      }

      setNextCursor(newCursor);
      setHasMore(!!newCursor && newItems.length > 0);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load fight opportunities");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    setNextCursor(null);
    await load({ reset: true });
  };

  const loadMore = useCallback(() => {
    load({ reset: false });
  }, [nextCursor, hasMore, loading]);

  const renderItem = ({ item }) => {
    const { slot, event } = item;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("FightOpportunityDetails", { slotId: slot.id })
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {event?.title || "Fight Opportunity"}
          </Text>

          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {String(slot.status).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.sub}>
          {event?.promotion_name || "Promotion"} • {event?.city || "City"},{" "}
          {event?.region || "Region"}
        </Text>

        <View style={styles.row}>
          <Ionicons name="barbell-outline" size={16} color="#ffd700" />
          <Text style={styles.rowText}>
            {slot.weight_class} • {slot.target_weight_lbs} lbs (±
            {slot.weight_tolerance_lbs})
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color="#ffd700" />
          <Text style={styles.rowText}>
            Event: {event?.event_date || "—"} • Deadline:{" "}
            {slot.application_deadline || "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="cash-outline" size={16} color="#ffd700" />
          <Text style={styles.rowText}>
            Purse:{" "}
            {slot.purse_cents != null
              ? `$${(slot.purse_cents / 100).toFixed(2)}`
              : "—"}{" "}
            • Travel: {slot.travel_support ? "Yes" : "No"}
          </Text>
        </View>

        {role === "fighter" ? (
          <View style={styles.ctaRow}>
            <Text style={styles.ctaHint}>Tap to view details & apply</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffd700" />
          </View>
        ) : (
          <View style={styles.ctaRow}>
            <Text style={styles.ctaHint}>Tap to view details</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffd700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Open Fights</Text>

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(x) => x.slot.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24 }}>
                <Text style={{ color: "#aaa" }}>
                  No open fight opportunities right now.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#181818" },
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 6 },
  screenTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#232323",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#ffd700",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    paddingRight: 10,
  },
  sub: { color: "#aaa", marginTop: 6 },

  pill: {
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  rowText: { color: "#fff", marginLeft: 8, fontWeight: "600" },

  ctaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  ctaHint: { color: "#aaa", fontWeight: "600" },
});
