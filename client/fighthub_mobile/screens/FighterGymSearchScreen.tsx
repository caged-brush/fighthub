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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import { Ionicons } from "@expo/vector-icons";

type RootNav = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type AuthContextShape = {
  userToken?: string | null;
};

type GymRow = {
  id: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  logo_path?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type FighterGymMembershipRow = {
  id: string;
  gym_id: string;
  user_id: string;
  role: "owner" | "coach" | "staff" | "fighter";
  status: "pending" | "active" | "rejected" | "revoked";
  created_at?: string;
  updated_at?: string;
  gyms?: GymRow | null;
};

type MembershipsResponse = {
  memberships: FighterGymMembershipRow[];
};

type JoinGymResponse = {
  ok: true;
  membership: FighterGymMembershipRow;
};

type GymCardProps = {
  gym: GymRow;
  membership?: FighterGymMembershipRow | null;
  busy: boolean;
  onJoin: () => void;
  onCancel: () => void;
  onOpen: () => void;
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

const FighterGymSearchScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [memberships, setMemberships] = useState<FighterGymMembershipRow[]>([]);
  const [actioningGymId, setActioningGymId] = useState<string | null>(null);

  const membershipMap = useMemo(() => {
    const map = new Map<string, FighterGymMembershipRow>();
    memberships.forEach((m) => {
      map.set(m.gym_id, m);
    });
    return map;
  }, [memberships]);

  const buildSearchUrl = () => {
    const params = new URLSearchParams();

    if (query.trim()) params.append("q", query.trim());
    if (region.trim()) params.append("region", region.trim());
    if (city.trim()) params.append("city", city.trim());

    const qs = params.toString();
    return `${API_URL}/fighters/gyms/search${qs ? `?${qs}` : ""}`;
  };

  const loadMemberships = useCallback(async () => {
    if (!userToken) return;

    const res = await fetch(`${API_URL}/fighters/gyms/my-memberships`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const data = await parseJsonResponse<MembershipsResponse>(res);
    setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
  }, [userToken]);

  const loadGyms = useCallback(async () => {
    const res = await fetch(buildSearchUrl());
    const data = await parseJsonResponse<GymRow[]>(res);
    setGyms(Array.isArray(data) ? data : []);
  }, [query, region, city]);

  const loadAll = useCallback(async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      await Promise.all([loadGyms(), loadMemberships()]);
    } catch (e: any) {
      console.log("Fighter gym search error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load gyms.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadGyms, loadMemberships, userToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const handleSearch = async () => {
    setLoading(true);
    await loadAll();
  };

  const handleJoin = async (gym: GymRow) => {
    if (!userToken) {
      Alert.alert("Error", "You are not logged in.");
      return;
    }

    try {
      setActioningGymId(gym.id);

      const res = await fetch(
        `${API_URL}/fighters/gyms/${gym.id}/join-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await parseJsonResponse<JoinGymResponse>(res);

      setMemberships((cur) => {
        const withoutCurrent = cur.filter((m) => m.gym_id !== gym.id);
        return [...withoutCurrent, data.membership];
      });

      Alert.alert("Request sent", `Join request sent to ${gym.name}.`);
    } catch (e: any) {
      console.log("Join gym error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to send join request.");
    } finally {
      setActioningGymId(null);
    }
  };

  const handleCancel = async (gym: GymRow) => {
    if (!userToken) {
      Alert.alert("Error", "You are not logged in.");
      return;
    }

    Alert.alert("Cancel request?", `Cancel your join request to ${gym.name}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Request",
        style: "destructive",
        onPress: async () => {
          try {
            setActioningGymId(gym.id);

            const res = await fetch(
              `${API_URL}/fighters/gyms/${gym.id}/join-request`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${userToken}`,
                },
              },
            );

            await parseJsonResponse<{ ok: true }>(res);

            setMemberships((cur) => cur.filter((m) => m.gym_id !== gym.id));

            Alert.alert("Cancelled", `Join request cancelled for ${gym.name}.`);
          } catch (e: any) {
            console.log("Cancel join request error:", e?.message || e);
            Alert.alert("Error", e?.message || "Failed to cancel request.");
          } finally {
            setActioningGymId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading gyms...</Text>
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
        <Text style={styles.brand}>Kavyx Fighter</Text>
        <Text style={styles.headline}>Find a gym.</Text>
        <Text style={styles.subhead}>
          Search gyms, request to join, and track your membership status.
        </Text>

        <View style={styles.searchCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Search</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Gym name or keyword"
              placeholderTextColor="#666"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Kamloops"
              placeholderTextColor="#666"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Region</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              placeholder="BC"
              placeholderTextColor="#666"
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.searchBtn}
            activeOpacity={0.85}
            onPress={handleSearch}
          >
            <Text style={styles.searchBtnText}>Search Gyms</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Results ({gyms.length})</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onRefresh}>
            <Text style={styles.refreshLink}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {gyms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No gyms found.</Text>
            <Text style={styles.emptyText}>
              Try a broader city or region search.
            </Text>
          </View>
        ) : (
          gyms.map((gym) => (
            <GymCard
              key={gym.id}
              gym={gym}
              membership={membershipMap.get(gym.id) || null}
              busy={actioningGymId === gym.id}
              onJoin={() => handleJoin(gym)}
              onCancel={() => handleCancel(gym)}
              onOpen={() =>
                navigation.navigate("GymDetailScreen", { gym, gymId: gym.id })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

function GymCard({
  gym,
  membership,
  busy,
  onJoin,
  onCancel,
  onOpen,
}: GymCardProps) {
  const location = [gym.city, gym.region, gym.country]
    .filter(Boolean)
    .join(", ");

  const statusText =
    membership?.status === "active"
      ? "Member"
      : membership?.status === "pending"
        ? "Pending"
        : membership?.status === "rejected"
          ? "Rejected"
          : membership?.status === "revoked"
            ? "Revoked"
            : null;

  return (
    <TouchableOpacity
      style={styles.gymCard}
      activeOpacity={0.85}
      onPress={onOpen}
    >
      <View style={styles.gymTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gymName}>{gym.name}</Text>
          <Text style={styles.gymMeta}>{location || "Location not set"}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          {!!statusText && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#ffd700" />
        </View>
      </View>

      <Text style={styles.gymBio}>
        {gym.bio?.trim() || "No gym bio provided."}
      </Text>

      <View style={styles.actionRow}>
        {membership?.status === "pending" ? (
          <TouchableOpacity
            style={[styles.cancelBtn, busy && styles.disabledBtn]}
            activeOpacity={0.85}
            onPress={onCancel}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            )}
          </TouchableOpacity>
        ) : membership?.status === "active" ? (
          <View style={styles.passiveBtn}>
            <Text style={styles.passiveBtnText}>Already a Member</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, busy && styles.disabledBtn]}
            activeOpacity={0.85}
            onPress={onJoin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#0b0b0b" size="small" />
            ) : (
              <Text style={styles.joinBtnText}>Request to Join</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
    color: "#ffd700",
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
    maxWidth: 340,
  },

  searchCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },

  field: {
    marginBottom: 12,
  },

  label: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  input: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  searchBtn: {
    backgroundColor: "#ffd700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },

  searchBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
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
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "800",
  },

  gymCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  gymTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },

  gymName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },

  gymMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    lineHeight: 18,
  },

  gymBio: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },

  statusBadge: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 12,
  },

  actionRow: {
    flexDirection: "row",
  },

  joinBtn: {
    flex: 1,
    backgroundColor: "#ffd700",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  joinBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#2a1111",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.25)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  cancelBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  passiveBtn: {
    flex: 1,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },

  passiveBtnText: {
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
});

export default FighterGymSearchScreen;
