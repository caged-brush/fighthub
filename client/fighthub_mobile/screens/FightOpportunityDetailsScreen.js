import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../lib/apiFetch";

// Same status-color system as the Open Fights feed, so a slot reads
// consistently whether you're scanning the list or looking at details.
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

export default function FightOpportunityDetailsScreen({ route, navigation }) {
  const { slotId } = route.params || {};
  const { userToken, role } = useContext(AuthContext);
  const token = userToken;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [applying, setApplying] = useState(false);

  const canApply = useMemo(() => role === "fighter", [role]);
  const isScout = useMemo(() => role === "scout", [role]);

  const load = async () => {
    if (!slotId) {
      Alert.alert("Error", "Missing slotId");
      navigation.goBack();
      return;
    }

    if (!token) {
      Alert.alert("Error", "Missing auth token");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      const res = await apiFetch(`/fights/slots/${slotId}`, {
        method: "GET",
        token,
      });

      setData(res);
    } catch (e) {
      console.log("STATUS:", e?.status);
      console.log("DATA:", e?.data);
      Alert.alert("Error", e?.message || "Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const applyToSlot = async () => {
    if (!canApply || applying) return;

    try {
      setApplying(true);

      await apiFetch(`/fights/slots/${slotId}/apply`, {
        method: "POST",
        token,
        body: {},
      });

      Alert.alert("Applied", "Your application was submitted.");
      await load();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const viewApplicants = () => {
    navigation.navigate("ScoutFightManager", {
      screen: "Applicants",
      params: { slotId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color="#E8B84B" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const slot = data?.slot;
  const event = data?.event;
  const meta = data?.meta || {};

  if (!slot || !event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <Text style={styles.notFoundTitle}>Opportunity not found</Text>
          <Text style={styles.notFoundText}>
            This listing may have been removed or filled.
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.goBackBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatusStyle(slot.status);
  const canActuallyApply =
    !applying && slot.allow_applications && slot.status === "open";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5F1E8"
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.eventTitle}>
            {event.title || "Fight Opportunity"}
          </Text>
          <View style={[styles.statusPill, { borderColor: status.solid }]}>
            <View
              style={[styles.statusDot, { backgroundColor: status.solid }]}
            />
            <Text style={[styles.statusText, { color: status.solid }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.eventSub}>
          {event.promotion_name || "Promotion"} · {event.city || "City"},{" "}
          {event.region || "Region"}
        </Text>

        {(meta.applicants_count != null || meta.viewer_application_status) && (
          <View style={styles.activityStrip}>
            {meta.applicants_count != null && (
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>
                  {meta.applicants_count}
                </Text>
                <Text style={styles.activityLabel}>Applicants</Text>
              </View>
            )}
            {meta.viewer_application_status && (
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>
                  {meta.viewer_application_status}
                </Text>
                <Text style={styles.activityLabel}>Your status</Text>
              </View>
            )}
          </View>
        )}

        <SectionLabel text="Event" />
        <Card>
          <Row
            label="Discipline"
            value={event.discipline}
            icon="fitness-outline"
          />
          <Row label="Date" value={event.event_date} icon="calendar-outline" />
          <Row label="Venue" value={event.venue} icon="location-outline" />
          <Row label="Rules" value={event.rules} icon="document-text-outline" />
          <Row
            label="Description"
            value={event.description}
            icon="information-circle-outline"
            last
          />
        </Card>

        <SectionLabel text="Slot requirements" />
        <Card>
          <Row
            label="Weight class"
            value={slot.weight_class}
            icon="barbell-outline"
          />
          <Row
            label="Target weight"
            value={
              slot.target_weight_lbs != null
                ? `${slot.target_weight_lbs} lbs`
                : "—"
            }
            icon="speedometer-outline"
          />
          <Row
            label="Tolerance"
            value={
              slot.weight_tolerance_lbs != null
                ? `±${slot.weight_tolerance_lbs} lbs`
                : "—"
            }
            icon="swap-vertical-outline"
          />
          <Row
            label="Min experience"
            value={slot.min_experience}
            icon="ribbon-outline"
          />
          <Row
            label="Style preferences"
            value={slot.style_preferences}
            icon="body-outline"
          />
          <Row
            label="Application deadline"
            value={slot.application_deadline}
            icon="time-outline"
          />
          <Row
            label="Travel support"
            value={slot.travel_support ? "Included" : "Not included"}
            icon="airplane-outline"
          />
          <Row
            label="Purse"
            value={
              slot.purse_cents != null
                ? `$${(slot.purse_cents / 100).toFixed(2)}`
                : "—"
            }
            icon="cash-outline"
          />
          <Row
            label="Applications"
            value={slot.allow_applications ? "Open" : "Closed"}
            icon="checkmark-circle-outline"
            last
          />
        </Card>

        <View style={styles.actions}>
          {canApply && (
            <TouchableOpacity
              onPress={applyToSlot}
              disabled={!canActuallyApply}
              activeOpacity={0.85}
              style={[styles.applyBtn, !canActuallyApply && { opacity: 0.45 }]}
            >
              {applying ? (
                <ActivityIndicator color="#0B0B0C" />
              ) : (
                <Text style={styles.applyText}>Apply for fight</Text>
              )}
            </TouchableOpacity>
          )}

          {isScout && (
            <TouchableOpacity
              onPress={viewApplicants}
              activeOpacity={0.85}
              style={styles.applicantsBtn}
            >
              <Text style={styles.applicantsText}>View applicants</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Row({ label, value, icon, last }) {
  const display = Array.isArray(value) ? value.join(", ") : (value ?? "—");

  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={styles.rowLeft}>
        {icon && (
          <Ionicons name={icon} size={15} color="rgba(245,241,232,0.4)" />
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={2}>
        {display}
      </Text>
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },
  container: { padding: 16, paddingBottom: 32 },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "rgba(245,241,232,0.5)", marginTop: 10 },

  notFoundTitle: {
    color: "#F5F1E8",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 6,
  },
  notFoundText: {
    color: "rgba(245,241,232,0.5)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
  },
  goBackBtn: {
    backgroundColor: "#E8B84B",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goBackText: { color: "#0B0B0C", fontWeight: "800" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  eventTitle: {
    color: "#F5F1E8",
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
    letterSpacing: -0.4,
  },
  eventSub: {
    color: "rgba(245,241,232,0.5)",
    marginTop: 6,
    fontSize: 13,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  statusText: { fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },

  activityStrip: {
    flexDirection: "row",
    gap: 24,
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
  },
  activityItem: { alignItems: "flex-start" },
  activityValue: {
    color: "#E8B84B",
    fontWeight: "900",
    fontSize: 18,
    textTransform: "capitalize",
  },
  activityLabel: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 2,
  },

  sectionLabel: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 22,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,241,232,0.07)",
    gap: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    width: 140,
  },
  rowLabel: {
    color: "rgba(245,241,232,0.5)",
    fontSize: 12,
    fontWeight: "600",
  },
  rowValue: {
    color: "#F5F1E8",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },

  actions: { marginTop: 24, gap: 10 },
  applyBtn: {
    backgroundColor: "#E8B84B",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  applyText: { color: "#0B0B0C", fontWeight: "900", fontSize: 15 },

  applicantsBtn: {
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.15)",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  applicantsText: { color: "#F5F1E8", fontWeight: "800", fontSize: 15 },
});
