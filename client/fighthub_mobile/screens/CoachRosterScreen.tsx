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

type MembershipItem = {
  id: string;
  gym_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  users: AppUser | null;
};

type RosterResponse = {
  roster: MembershipItem[];
};

type GymChipProps = {
  name: string;
  active: boolean;
  onPress: () => void;
};

type MemberCardProps = {
  item: MembershipItem;
  busy: boolean;
  onOpenProfile: () => void;
  onRemove: () => void;
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

const CoachRosterScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [memberships, setMemberships] = useState<DashboardGymMembership[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [roster, setRoster] = useState<MembershipItem[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const selectedMembership = useMemo(() => {
    return memberships.find((m) => m.gym_id === selectedGymId) || null;
  }, [memberships, selectedGymId]);

  const selectedGym = selectedMembership?.gyms || null;

  const loadGyms = useCallback(async () => {
    if (!userToken) return null;

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

  const loadRoster = useCallback(
    async (gymId: string) => {
      if (!userToken) return;

      const res = await fetch(`${API_URL}/coach/gyms/${gymId}/roster`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await parseJsonResponse<RosterResponse>(res);
      const rosterRows = Array.isArray(data.roster) ? data.roster : [];

      const filtered = rosterRows.filter((item) => item.role === "fighter");
      setRoster(filtered);
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
        setRoster([]);
        return;
      }

      await loadRoster(gymId);
    } catch (e: any) {
      console.log("Coach roster load error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load coach roster.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadGyms, loadRoster, userToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedGymId || !userToken || loading) return;

    loadRoster(selectedGymId).catch((e: any) => {
      console.log("Coach roster gym switch error:", e?.message || e);
    });
  }, [selectedGymId, loading, loadRoster, userToken]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const confirmRemove = (item: MembershipItem) => {
    const displayName =
      `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
      "this member";

    Alert.alert(
      "Remove member?",
      `Remove ${displayName} from this gym roster?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => handleRemove(item),
        },
      ],
    );
  };

  const handleRemove = async (item: MembershipItem) => {
    if (!userToken || !selectedGymId) {
      Alert.alert("Error", "Missing auth or gym context.");
      return;
    }

    try {
      setActioningId(item.id);

      const res = await fetch(
        `${API_URL}/coach/gyms/${selectedGymId}/memberships/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await parseJsonResponse<{ ok: true }>(res);

      if (!data.ok) {
        throw new Error("Failed to remove member.");
      }

      setRoster((cur) => cur.filter((row) => row.id !== item.id));
    } catch (e: any) {
      console.log("Coach roster remove error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to remove member.");
    } finally {
      setActioningId(null);
    }
  };

  const openEndorseFlow = (item: MembershipItem) => {
    if (!selectedGymId) {
      Alert.alert("Error", "No gym selected.");
      return;
    }

    const fighterName =
      `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
      "Unknown fighter";

    navigation.navigate("CoachEndorseApplicationsScreen", {
      fighterId: item.user_id,
      fighterName,
      gymId: selectedGymId,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading roster...</Text>
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
            You need an active gym before you can manage a roster.
          </Text>

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active gym memberships.</Text>
            <Text style={styles.emptyText}>
              Create a gym first, then your roster will appear here.
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
        <Text style={styles.headline}>Manage your roster.</Text>
        <Text style={styles.subhead}>
          Review fighters, remove weak entries, and endorse strong applications.
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Active roster ({roster.length})
          </Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onRefresh}>
            <Text style={styles.refreshLink}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {roster.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active roster members.</Text>
            <Text style={styles.emptyText}>
              Once fighters are approved, they will appear here.
            </Text>
          </View>
        ) : (
          roster.map((item) => (
            <MemberCard
              key={item.id}
              item={item}
              busy={actioningId === item.id}
              onOpenProfile={() =>
                navigation.navigate("UserProfile", { userId: item.user_id })
              }
              onRemove={() => confirmRemove(item)}
              onEndorse={() => openEndorseFlow(item)}
            />
          ))
        )}
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

function MemberCard({
  item,
  busy,
  onOpenProfile,
  onRemove,
  onEndorse,
}: MemberCardProps) {
  const displayName =
    `${item.users?.fname || ""} ${item.users?.lname || ""}`.trim() ||
    "Unknown member";

  const meta = [item.users?.role, item.role, item.status]
    .filter(Boolean)
    .join(" • ");

  return (
    <View style={styles.memberCard}>
      <TouchableOpacity activeOpacity={0.85} onPress={onOpenProfile}>
        <Text style={styles.memberName}>{displayName}</Text>
        <Text style={styles.memberMeta}>{meta || "—"}</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.profileBtn}
          activeOpacity={0.85}
          onPress={onOpenProfile}
          disabled={busy}
        >
          <Text style={styles.profileBtnText}>Open Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endorseBtn}
          activeOpacity={0.85}
          onPress={onEndorse}
          disabled={busy}
        >
          <Text style={styles.endorseBtnText}>Endorse</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.removeBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={onRemove}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.removeBtnText}>Remove</Text>
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

  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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

  memberCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  memberName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },

  memberMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  profileBtn: {
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

  profileBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  endorseBtn: {
    flex: 1,
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

  removeBtn: {
    flex: 1,
    backgroundColor: "#2a1111",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.25)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  removeBtnText: {
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

export default CoachRosterScreen;
