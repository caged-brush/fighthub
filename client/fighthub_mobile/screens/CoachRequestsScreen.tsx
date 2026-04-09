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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type RootNav = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type AuthContextShape = {
  userToken?: string | null;
};

type Gym = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
};

type DashboardGymMembership = {
  gym_id: string;
  role: "owner" | "coach" | "staff" | "fighter";
  status: "pending" | "active" | "rejected" | "revoked";
  gyms: Gym | null;
};

type DashboardResponse = {
  gyms: DashboardGymMembership[];
};

type AppUser = {
  id: string;
  role: string | null;
  fname?: string | null;
  lname?: string | null;
  profile_picture_url?: string | null;
};

type MembershipRequest = {
  id: string;
  gym_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  users: AppUser | null;
};

type RequestsResponse = {
  requests: MembershipRequest[];
};

type GymChipProps = {
  name: string;
  active: boolean;
  onPress: () => void;
};

type RequestCardProps = {
  item: MembershipRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenProfile: () => void;
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

const CoachRequestsScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [memberships, setMemberships] = useState<DashboardGymMembership[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const selectedMembership = useMemo(() => {
    return memberships.find((m) => m.gym_id === selectedGymId) || null;
  }, [memberships, selectedGymId]);

  const selectedGym = selectedMembership?.gyms || null;

  const loadGyms = useCallback(async () => {
    if (!userToken) return;

    const res = await fetch(`${API_URL}/coach/dashboard`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const data = await parseJsonResponse<DashboardResponse>(res);
    const gyms = Array.isArray(data.gyms) ? data.gyms : [];

    setMemberships(gyms);

    const nextGymId =
      selectedGymId && gyms.some((g) => g.gym_id === selectedGymId)
        ? selectedGymId
        : gyms[0]?.gym_id || null;

    setSelectedGymId(nextGymId);

    return nextGymId;
  }, [selectedGymId, userToken]);

  const loadRequests = useCallback(
    async (gymId: string) => {
      if (!userToken) return;

      const res = await fetch(`${API_URL}/coach/gyms/${gymId}/requests`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await parseJsonResponse<RequestsResponse>(res);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    },
    [userToken],
  );

  const loadAll = useCallback(async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const gymId = await loadGyms();

      if (!gymId) {
        setRequests([]);
        return;
      }

      await loadRequests(gymId);
    } catch (e: any) {
      console.log("Coach requests load error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load coach requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadGyms, loadRequests, userToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedGymId || !userToken || loading) return;

    loadRequests(selectedGymId).catch((e: any) => {
      console.log("Coach requests gym switch error:", e?.message || e);
    });
  }, [selectedGymId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const runAction = async (
    membershipId: string,
    action: "approve" | "reject",
  ) => {
    if (!userToken || !selectedGymId) {
      Alert.alert("Error", "Missing auth or gym context.");
      return;
    }

    try {
      setActioningId(membershipId);

      const res = await fetch(
        `${API_URL}/coach/gyms/${selectedGymId}/memberships/${membershipId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await parseJsonResponse<{ ok: true }>(res);
      if (!data.ok) {
        throw new Error(`Failed to ${action} request.`);
      }

      setRequests((cur) => cur.filter((item) => item.id !== membershipId));
    } catch (e: any) {
      console.log(`Coach requests ${action} error:`, e?.message || e);
      Alert.alert("Error", e?.message || `Failed to ${action} request.`);
    } finally {
      setActioningId(null);
    }
  };

  const confirmApprove = (item: MembershipRequest) => {
    const displayName =
      `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
      "this fighter";

    Alert.alert(
      "Approve request?",
      `Approve ${displayName} and add them to the gym roster?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => runAction(item.id, "approve"),
        },
      ],
    );
  };

  const confirmReject = (item: MembershipRequest) => {
    const displayName =
      `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
      "this fighter";

    Alert.alert(
      "Reject request?",
      `Reject ${displayName}'s request to join this gym?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => runAction(item.id, "reject"),
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedGym) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.brand}>Kavyx Coach</Text>
          <Text style={styles.headline}>No gym found.</Text>
          <Text style={styles.subhead}>
            You need an active gym before you can manage join requests.
          </Text>

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active gym memberships.</Text>
            <Text style={styles.emptyText}>
              Create a gym first, then fighters can request to join.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("CoachSetupScreen")}
            >
              <Text style={styles.primaryBtnText}>Create Gym</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
        <Text style={styles.brand}>Kavyx Coach</Text>
        <Text style={styles.headline}>Review join requests.</Text>
        <Text style={styles.subhead}>
          Approve real fighters. Reject junk. Keep your gym clean.
        </Text>

        {memberships.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your gyms</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gymRow}
            >
              {memberships.map((membership) => (
                <GymChip
                  key={membership.gym_id}
                  name={membership.gyms?.name || "Unnamed Gym"}
                  active={membership.gym_id === selectedGymId}
                  onPress={() => setSelectedGymId(membership.gym_id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.gymCard}>
          <Text style={styles.gymLabel}>CURRENT GYM</Text>
          <Text style={styles.gymName}>{selectedGym.name}</Text>
          <Text style={styles.gymMeta}>
            {[selectedGym.city, selectedGym.region, selectedGym.country]
              .filter(Boolean)
              .join(", ") || "Location not set"}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Pending requests ({requests.length})
            </Text>

            <TouchableOpacity activeOpacity={0.85} onPress={onRefresh}>
              <Text style={styles.refreshLink}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No pending requests.</Text>
              <Text style={styles.emptyText}>
                When fighters ask to join this gym, they’ll show up here.
              </Text>
            </View>
          ) : (
            requests.map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                busy={actioningId === item.id}
                onApprove={() => confirmApprove(item)}
                onReject={() => confirmReject(item)}
                onOpenProfile={() =>
                  navigation.navigate("UserProfile", { userId: item.user_id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function GymChip({ name, active, onPress }: GymChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.gymChip, active && styles.gymChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.gymChipText, active && styles.gymChipTextActive]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function RequestCard({
  item,
  busy,
  onApprove,
  onReject,
  onOpenProfile,
}: RequestCardProps) {
  const displayName =
    `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
    "Unknown fighter";

  const meta = [item.users?.role, item.role, item.status]
    .filter(Boolean)
    .join(" • ");

  return (
    <View style={styles.requestCard}>
      <TouchableOpacity activeOpacity={0.85} onPress={onOpenProfile}>
        <Text style={styles.requestName}>{displayName}</Text>
        <Text style={styles.requestMeta}>{meta || "—"}</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.rejectBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={onReject}
          disabled={busy}
        >
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={onApprove}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#0b0b0b" />
          ) : (
            <Text style={styles.approveBtnText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
    maxWidth: 280,
  },

  subhead: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 340,
  },

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  refreshLink: {
    color: "#4da3ff",
    fontSize: 13,
    fontWeight: "800",
  },

  gymRow: {
    gap: 10,
  },

  gymChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  gymChipActive: {
    backgroundColor: "rgba(77,163,255,0.12)",
    borderColor: "rgba(77,163,255,0.35)",
  },

  gymChipText: {
    color: "#bbb",
    fontWeight: "800",
  },

  gymChipTextActive: {
    color: "#4da3ff",
  },

  gymCard: {
    backgroundColor: "#121212",
    borderWidth: 1.5,
    borderColor: "#4da3ff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  gymLabel: {
    alignSelf: "flex-start",
    color: "#4da3ff",
    backgroundColor: "rgba(77,163,255,0.14)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 12,
  },

  gymName: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },

  gymMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  requestCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  requestName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },

  requestMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  approveBtn: {
    flex: 1,
    backgroundColor: "#4da3ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  approveBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  rejectBtnText: {
    color: "#ffffff",
    fontWeight: "800",
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

  primaryBtn: {
    backgroundColor: "#4da3ff",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 14,
  },

  primaryBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },
});

export default CoachRequestsScreen;
