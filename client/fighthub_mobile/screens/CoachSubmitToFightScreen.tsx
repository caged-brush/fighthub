import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type RootNav = {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type RouteParams = {
  fighterId?: string;
  fighterName?: string;
  gymId?: string;
};

type AuthShape = {
  userToken?: string | null;
};

type OpenSlotItem = {
  slot: {
    id: string;
    discipline: string;
    weight_class: string;
    target_weight_lbs?: number | null;
    weight_tolerance_lbs?: number | null;
    min_experience?: string | null;
    application_deadline?: string | null;
    travel_support?: string | null;
    purse_cents?: number | null;
    status: string;
    created_at?: string | null;
  };
  event: {
    id: string;
    promotion_name?: string | null;
    title?: string | null;
    region?: string | null;
    city?: string | null;
    venue?: string | null;
    event_date?: string | null;
    discipline?: string | null;
  } | null;
};

type OpenSlotsResponse = {
  slots: OpenSlotItem[];
  nextCursor: string | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data as T;
}

export default function CoachSubmitToFightScreen() {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<any>();
  const { userToken } = useContext(AuthContext) as AuthShape;

  const params = (route.params || {}) as RouteParams;
  const fighterId = params.fighterId || "";
  const fighterName = params.fighterName || "Unknown fighter";
  const gymId = params.gymId || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [slots, setSlots] = useState<OpenSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<OpenSlotItem | null>(null);
  const [endorsementNote, setEndorsementNote] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/fights/open-slots?limit=50`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await parseJson<OpenSlotsResponse>(res);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (e: any) {
      console.log("Coach submit load slots error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load open fights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSlots();
  }, [loadSlots]);

  const openSubmitModal = (item: OpenSlotItem) => {
    setSelectedSlot(item);
    setEndorsementNote("");
    setModalVisible(true);
  };

  const closeSubmitModal = () => {
    setSelectedSlot(null);
    setEndorsementNote("");
    setModalVisible(false);
  };

  const submitFighter = async () => {
    if (!userToken || !fighterId || !gymId || !selectedSlot) {
      Alert.alert("Error", "Missing fighter, gym, or fight context.");
      return;
    }

    try {
      setSubmittingId(selectedSlot.slot.id);

      const res = await fetch(
        `${API_URL}/fights/slots/${selectedSlot.slot.id}/submit-by-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            fighter_id: fighterId,
            gym_id: gymId,
            endorsement_note: endorsementNote.trim() || null,
          }),
        },
      );

      await parseJson<{ ok: true; application: any }>(res);

      closeSubmitModal();

      Alert.alert(
        "Submitted",
        `${fighterName} was submitted and endorsed for this fight.`,
      );
    } catch (e: any) {
      console.log("Coach submit fighter error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to submit fighter.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading open fights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.brand}>Kavyx Coach</Text>
        <Text style={styles.headline}>Submit fighter to a fight.</Text>
        <Text style={styles.subhead}>
          Submit {fighterName} to open fight opportunities with your coach
          endorsement.
        </Text>

        <View style={styles.fighterCard}>
          <Text style={styles.fighterLabel}>FIGHTER</Text>
          <Text style={styles.fighterName}>{fighterName}</Text>
          <Text style={styles.fighterMeta}>Gym-backed coach submission</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open fights ({slots.length})</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {slots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No open fights.</Text>
            <Text style={styles.emptyText}>
              There are no open fight opportunities available right now.
            </Text>
          </View>
        ) : (
          slots.map((item) => {
            const slot = item.slot;
            const event = item.event;
            const busy = submittingId === slot.id;

            return (
              <View key={slot.id} style={styles.slotCard}>
                <Text style={styles.eventTitle}>
                  {event?.title || "Fight Opportunity"}
                </Text>

                <Text style={styles.eventMeta}>
                  {event?.promotion_name || "Unknown promotion"}
                </Text>

                <Text style={styles.eventMeta}>
                  {[event?.city, event?.region].filter(Boolean).join(", ") ||
                    "Location not set"}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    {String(slot.discipline || "unknown").toUpperCase()} •{" "}
                    {slot.weight_class || "N/A"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    Target: {slot.target_weight_lbs ?? "—"} lbs ±
                    {slot.weight_tolerance_lbs ?? "—"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    Event: {event?.event_date || "—"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    Deadline: {slot.application_deadline || "—"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, busy && styles.disabledBtn]}
                  activeOpacity={0.85}
                  disabled={busy}
                  onPress={() => openSubmitModal(item)}
                >
                  {busy ? (
                    <ActivityIndicator color="#0b0b0b" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Fighter</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSubmitModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Confirm submission</Text>
            <Text style={styles.modalSubhead}>
              {fighterName} →{" "}
              {selectedSlot?.event?.title || "Fight Opportunity"}
            </Text>

            <Text style={styles.modalMeta}>
              {String(
                selectedSlot?.slot?.discipline || "unknown",
              ).toUpperCase()}{" "}
              • {selectedSlot?.slot?.weight_class || "N/A"}
            </Text>

            <Text style={styles.label}>Coach endorsement note</Text>
            <TextInput
              value={endorsementNote}
              onChangeText={setEndorsementNote}
              placeholder="Example: Strong wrestler, reliable, fight-ready."
              placeholderTextColor="#666"
              multiline
              style={styles.textarea}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeSubmitModal}
                disabled={!!submittingId}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !!submittingId && styles.disabledBtn,
                ]}
                onPress={submitFighter}
                disabled={!!submittingId}
              >
                {submittingId ? (
                  <ActivityIndicator color="#0b0b0b" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#aaa",
    marginTop: 12,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    paddingBottom: 32,
  },

  backText: {
    color: "#4da3ff",
    fontWeight: "800",
    marginBottom: 14,
  },

  brand: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  headline: {
    color: "#4da3ff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 10,
  },

  subhead: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },

  fighterCard: {
    backgroundColor: "#121212",
    borderWidth: 1.5,
    borderColor: "#4da3ff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  fighterLabel: {
    color: "#4da3ff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },

  fighterName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },

  fighterMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  refreshText: {
    color: "#4da3ff",
    fontWeight: "800",
  },

  slotCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  eventTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },

  eventMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    marginBottom: 4,
  },

  infoRow: {
    marginTop: 8,
  },

  infoText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
  },

  submitBtn: {
    backgroundColor: "#4da3ff",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },

  submitBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
  },

  disabledBtn: {
    opacity: 0.55,
  },

  emptyCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  emptyTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 8,
  },

  emptyText: {
    color: "rgba(255,255,255,0.62)",
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    borderTopWidth: 1,
    borderColor: "#222",
  },

  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#444",
    alignSelf: "center",
    marginBottom: 18,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  modalSubhead: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 6,
  },

  modalMeta: {
    color: "#aaa",
    marginBottom: 16,
  },

  label: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 8,
  },

  textarea: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    marginBottom: 16,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: "#4da3ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  confirmBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
  },
});
