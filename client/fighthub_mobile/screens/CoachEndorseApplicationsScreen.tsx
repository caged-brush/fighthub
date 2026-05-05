import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type RootNav = {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type AuthContextShape = {
  userToken?: string | null;
};

type RouteParams = {
  fighterId?: string;
  fighterName?: string;
  gymId?: string;
};

type CoachFighterApplication = {
  id: string;
  fight_slot_id: string;
  fighter_id: string;
  status: string;
  created_at?: string | null;

  endorsement_status?: string | null;
  endorsement_note?: string | null;
  endorsed_by_coach_user_id?: string | null;

  event_title?: string | null;
  promotion_name?: string | null;
  discipline?: string | null;
  weight_class?: string | null;
  event_date?: string | null;
  city?: string | null;
  region?: string | null;
};

type ApplicationsResponse = {
  applications: CoachFighterApplication[];
};

type EndorseResponse = {
  ok: true;
  application: {
    id: string;
    status: string;
    endorsement_status?: string | null;
    endorsed_by_coach_user_id?: string | null;
    endorsement_note?: string | null;
    updated_at?: string | null;
  };
};

type ApplicationCardProps = {
  item: CoachFighterApplication;
  busy: boolean;
  onEndorse: () => void;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: T | { message?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? (data as { message?: string }).message
        : undefined;

    throw new Error(message || `Request failed (${res.status})`);
  }

  return data as T;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "#8B5CF6",
  shortlisted: "#F59E0B",
  booked: "#16A34A",
  accepted: "#16A34A",
  rejected: "#DC2626",
  withdrawn: "#6B7280",
};

const ENDORSE_COLORS: Record<string, string> = {
  endorsed: "#22C55E",
  retracted: "#F97316",
  none: "#444",
};

const CoachEndorseApplicationsScreen = () => {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<any>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const params = (route.params || {}) as RouteParams;
  const fighterId = params.fighterId || "";
  const fighterName = params.fighterName || "Unknown fighter";
  const gymId = params.gymId || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<CoachFighterApplication[]>(
    [],
  );
  const [actingId, setActingId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<CoachFighterApplication | null>(null);
  const [endorsementNote, setEndorsementNote] = useState("");

  const endorsableApplications = useMemo(() => {
    return applications.filter((app) =>
      ["submitted", "shortlisted"].includes(app.status),
    );
  }, [applications]);

  const loadApplications = useCallback(async () => {
    if (!userToken || !fighterId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const query = new URLSearchParams();
      query.append("fighterId", fighterId);
      if (gymId) query.append("gymId", gymId);

      const res = await fetch(
        `${API_URL}/coach/fighters/${fighterId}/applications?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await parseJsonResponse<ApplicationsResponse>(res);
      setApplications(
        Array.isArray(data.applications) ? data.applications : [],
      );
    } catch (e: any) {
      console.log("Coach endorse applications load error:", e?.message || e);
      Alert.alert(
        "Error",
        e?.message || "Failed to load fighter applications.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fighterId, gymId, userToken]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadApplications();
  }, [loadApplications]);

  const openEndorseModal = (item: CoachFighterApplication) => {
    setSelectedApplication(item);
    setEndorsementNote(item.endorsement_note || "");
    setModalVisible(true);
  };

  const closeEndorseModal = () => {
    setModalVisible(false);
    setSelectedApplication(null);
    setEndorsementNote("");
  };

  const handleEndorse = async () => {
    if (!userToken || !selectedApplication) {
      Alert.alert("Error", "Missing auth or application context.");
      return;
    }

    try {
      setActingId(selectedApplication.id);

      const res = await fetch(
        `${API_URL}/fights/applications/${selectedApplication.id}/endorse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            endorsement_note: endorsementNote.trim() || null,
          }),
        },
      );

      const data = await parseJsonResponse<EndorseResponse>(res);

      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplication.id
            ? {
                ...app,
                endorsement_status:
                  data.application.endorsement_status || "endorsed",
                endorsement_note: data.application.endorsement_note || null,
                endorsed_by_coach_user_id:
                  data.application.endorsed_by_coach_user_id || null,
              }
            : app,
        ),
      );

      closeEndorseModal();
      Alert.alert("Success", "Application endorsed.");
    } catch (e: any) {
      console.log("Coach endorse error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to endorse application.");
    } finally {
      setActingId(null);
    }
  };

  const renderStatusPill = (status?: string | null) => {
    const normalized = status || "unknown";
    const bg = STATUS_COLORS[normalized] || "#444";

    return (
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={styles.pillText}>{normalized}</Text>
      </View>
    );
  };

  const renderEndorsementPill = (status?: string | null) => {
    const normalized = status || "none";
    const bg = ENDORSE_COLORS[normalized] || "#444";

    return (
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={styles.pillText}>
          {normalized === "none" ? "not endorsed" : normalized}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <TouchableOpacity
          style={styles.backRow}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.brand}>Kavyx Coach</Text>
        <Text style={styles.headline}>Endorse applications.</Text>
        <Text style={styles.subhead}>
          Review {fighterName}&apos;s submitted fights and endorse the strong
          ones.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{fighterName}</Text>
          <Text style={styles.summaryMeta}>
            Endorsable applications: {endorsableApplications.length}
          </Text>
        </View>

        {applications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No applications found.</Text>
            <Text style={styles.emptyText}>
              This fighter has not submitted any fight applications yet.
            </Text>
          </View>
        ) : (
          applications.map((item) => (
            <ApplicationCard
              key={item.id}
              item={item}
              busy={actingId === item.id}
              onEndorse={() => openEndorseModal(item)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEndorseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Endorse application</Text>

            <Text style={styles.modalSubhead}>
              {selectedApplication?.event_title || "Untitled Event"}
            </Text>

            <Text style={styles.modalMeta}>
              {String(
                selectedApplication?.discipline || "unknown",
              ).toUpperCase()}{" "}
              • {selectedApplication?.weight_class || "N/A"}
            </Text>

            <Text style={styles.label}>Endorsement note</Text>
            <TextInput
              value={endorsementNote}
              onChangeText={setEndorsementNote}
              placeholder="Add a short endorsement note..."
              placeholderTextColor="#666"
              multiline
              style={styles.textarea}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.85}
                onPress={closeEndorseModal}
                disabled={!!actingId}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.endorseSubmitBtn,
                  !!actingId && styles.disabledBtn,
                ]}
                activeOpacity={0.85}
                onPress={handleEndorse}
                disabled={!!actingId}
              >
                {actingId ? (
                  <ActivityIndicator color="#0b0b0b" size="small" />
                ) : (
                  <Text style={styles.endorseSubmitBtnText}>Endorse</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  function ApplicationCard({ item, busy, onEndorse }: ApplicationCardProps) {
    const location = [item.city, item.region].filter(Boolean).join(", ");
    const eventDate = item.event_date
      ? new Date(item.event_date).toLocaleDateString()
      : "Unknown date";

    const locked =
      item.status === "booked" ||
      item.status === "accepted" ||
      item.status === "rejected" ||
      item.status === "withdrawn";

    return (
      <View style={styles.appCard}>
        <Text style={styles.appTitle}>
          {item.event_title || "Untitled Event"}
        </Text>

        <Text style={styles.appMeta}>
          {item.promotion_name || "Unknown promotion"}
        </Text>

        <Text style={styles.appMeta}>
          {String(item.discipline || "unknown").toUpperCase()} •{" "}
          {item.weight_class || "N/A"}
        </Text>

        <Text style={styles.appMeta}>
          {location || "Location not set"} • {eventDate}
        </Text>

        <View style={styles.pillsRow}>
          {renderStatusPill(item.status)}
          {renderEndorsementPill(item.endorsement_status)}
        </View>

        {!!item.endorsement_note && (
          <Text style={styles.noteText}>Note: {item.endorsement_note}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.endorseBtn,
            (busy || locked || item.endorsement_status === "endorsed") &&
              styles.disabledBtn,
          ]}
          activeOpacity={0.85}
          onPress={onEndorse}
          disabled={busy || locked || item.endorsement_status === "endorsed"}
        >
          {busy ? (
            <ActivityIndicator color="#0b0b0b" size="small" />
          ) : (
            <Text style={styles.endorseBtnText}>
              {item.endorsement_status === "endorsed"
                ? "Already Endorsed"
                : locked
                  ? "Locked"
                  : "Endorse Application"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  backRow: {
    marginBottom: 10,
    alignSelf: "flex-start",
  },

  backText: {
    color: "#4da3ff",
    fontSize: 14,
    fontWeight: "800",
  },

  brand: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    opacity: 0.88,
    marginBottom: 10,
  },

  headline: {
    color: "#4da3ff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 10,
    maxWidth: 300,
  },

  subhead: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 350,
  },

  summaryCard: {
    backgroundColor: "#121212",
    borderWidth: 1.5,
    borderColor: "#4da3ff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  summaryTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },

  summaryMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  appCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  appTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },

  appMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },

  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 10,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  pillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  noteText: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },

  endorseBtn: {
    backgroundColor: "#4da3ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  endorseBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  emptyCard: {
    backgroundColor: "#121212",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },

  emptyText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 14,
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
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  modalSubhead: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
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
    fontSize: 14,
  },

  endorseSubmitBtn: {
    flex: 1,
    backgroundColor: "#4da3ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  endorseSubmitBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },
});

export default CoachEndorseApplicationsScreen;
