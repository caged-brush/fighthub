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

// Status reads as a fight-card result, not a generic app pill.
const STATUS_STYLES = {
  OPEN: { solid: "#E8B84B", label: "OPEN" },
  FILLED: { solid: "rgba(245,241,232,0.35)", label: "FILLED" },
  CLOSED: { solid: "#D6473F", label: "CLOSED" },
};

function getStatusStyle(status) {
  const key = String(status || "").toUpperCase();
  return (
    STATUS_STYLES[key] || { solid: "rgba(245,241,232,0.35)", label: key || "—" }
  );
}

export default function Home({ navigation }) {
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
    const status = getStatusStyle(slot.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("FightOpportunityDetails", { slotId: slot.id })
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event?.title || "Fight Opportunity"}
          </Text>

          <View style={[styles.pill, { borderColor: status.solid }]}>
            <View style={[styles.pillDot, { backgroundColor: status.solid }]} />
            <Text style={[styles.pillText, { color: status.solid }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.sub}>
          {event?.promotion_name || "Promotion"} · {event?.city || "City"},{" "}
          {event?.region || "Region"}
        </Text>

        {/* tale-of-the-tape stat block */}
        <View style={styles.tape}>
          <TapeRow
            icon="barbell-outline"
            label="Weight"
            value={`${slot.weight_class} · ${slot.target_weight_lbs} lbs (±${slot.weight_tolerance_lbs})`}
          />
          <TapeRow
            icon="calendar-outline"
            label="Dates"
            value={`Event ${event?.event_date || "—"} · Deadline ${
              slot.application_deadline || "—"
            }`}
          />
          <TapeRow
            icon="cash-outline"
            label="Purse"
            value={`${
              slot.purse_cents != null
                ? `$${(slot.purse_cents / 100).toFixed(2)}`
                : "—"
            } · Travel ${slot.travel_support ? "included" : "not included"}`}
            last
          />
        </View>

        <View style={styles.ctaRow}>
          <Text style={styles.ctaHint}>
            {role === "fighter"
              ? "Tap to view details & apply"
              : "Tap to view details"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#E8B84B" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>FIGHT BOARD</Text>
        </View>
        <Text style={styles.screenTitle}>Open Fights</Text>

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(x) => x.slot.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5F1E8"
            />
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color="#E8B84B"
              />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No fights on the board</Text>
                <Text style={styles.emptyText}>
                  New opportunities will show up here as soon as they open.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function TapeRow({ icon, label, value, last }) {
  return (
    <View style={[styles.tapeRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.tapeLabelGroup}>
        <Ionicons name={icon} size={14} color="rgba(245,241,232,0.45)" />
        <Text style={styles.tapeLabel}>{label}</Text>
      </View>
      <Text style={styles.tapeValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B0B0C" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D6473F",
    marginRight: 8,
  },
  eyebrow: {
    color: "rgba(245,241,232,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  screenTitle: {
    color: "#F5F1E8",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 16,
    letterSpacing: -0.4,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: "#F5F1E8",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    paddingRight: 10,
    lineHeight: 21,
  },
  sub: {
    color: "rgba(245,241,232,0.5)",
    marginTop: 6,
    fontSize: 13,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6,
  },
  pillText: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.8,
  },

  tape: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,241,232,0.08)",
  },
  tapeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,241,232,0.08)",
  },
  tapeLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    width: 78,
  },
  tapeLabel: {
    color: "rgba(245,241,232,0.45)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginLeft: 6,
  },
  tapeValue: {
    color: "#F5F1E8",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  ctaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  ctaHint: {
    color: "rgba(245,241,232,0.5)",
    fontWeight: "600",
    fontSize: 13,
  },

  emptyWrap: { padding: 32, alignItems: "center" },
  emptyTitle: {
    color: "#F5F1E8",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },
  emptyText: {
    color: "rgba(245,241,232,0.45)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
