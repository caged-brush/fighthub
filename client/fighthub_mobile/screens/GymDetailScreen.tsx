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
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type RootNav = {
  goBack: () => void;
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

type RouteParams = {
  gym?: GymRow;
  gymId?: string;
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

const normalizeUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const GymDetailScreen = () => {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<any>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const params = (route.params || {}) as RouteParams;
  const initialGym = params.gym || null;
  const gymId = params.gymId || initialGym?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [gym, setGym] = useState<GymRow | null>(initialGym);
  const [membership, setMembership] = useState<FighterGymMembershipRow | null>(
    null,
  );

  const location = useMemo(() => {
    return [gym?.city, gym?.region, gym?.country].filter(Boolean).join(", ");
  }, [gym]);

  const statusLabel = useMemo(() => {
    if (!membership) return null;
    if (membership.status === "active") return "Member";
    if (membership.status === "pending") return "Pending";
    if (membership.status === "rejected") return "Rejected";
    if (membership.status === "revoked") return "Revoked";
    return membership.status;
  }, [membership]);

  const loadMembershipState = useCallback(async () => {
    if (!userToken || !gymId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/fighters/gyms/my-memberships`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await parseJsonResponse<MembershipsResponse>(res);
      const rows = Array.isArray(data.memberships) ? data.memberships : [];
      const current = rows.find((row) => row.gym_id === gymId) || null;

      setMembership(current);

      if (!gym && current?.gyms) {
        setGym(current.gyms);
      }
    } catch (e: any) {
      console.log("Gym detail load error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load gym details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gym, gymId, userToken]);

  useEffect(() => {
    loadMembershipState();
  }, [loadMembershipState]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMembershipState();
  }, [loadMembershipState]);

  const handleJoin = async () => {
    if (!userToken || !gymId) {
      Alert.alert("Error", "Missing auth or gym context.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch(
        `${API_URL}/fighters/gyms/${gymId}/join-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await parseJsonResponse<JoinGymResponse>(res);
      setMembership(data.membership);

      Alert.alert(
        "Request sent",
        `Join request sent to ${gym?.name || "gym"}.`,
      );
    } catch (e: any) {
      console.log("Join gym error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to send join request.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!userToken || !gymId) {
      Alert.alert("Error", "Missing auth or gym context.");
      return;
    }

    Alert.alert(
      "Cancel request?",
      `Cancel your join request to ${gym?.name || "this gym"}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);

              const res = await fetch(
                `${API_URL}/fighters/gyms/${gymId}/join-request`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${userToken}`,
                  },
                },
              );

              await parseJsonResponse<{ ok: true }>(res);
              setMembership(null);

              Alert.alert("Cancelled", "Join request cancelled.");
            } catch (e: any) {
              console.log("Cancel join request error:", e?.message || e);
              Alert.alert("Error", e?.message || "Failed to cancel request.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const openWebsite = async () => {
    const url = normalizeUrl(gym?.website);
    if (!url) return;

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Error", "Cannot open website.");
      return;
    }

    await Linking.openURL(url);
  };

  const openInstagram = async () => {
    const handle = gym?.instagram?.trim();
    if (!handle) return;

    const clean = handle.replace(/^@/, "");
    const url = `https://instagram.com/${clean}`;

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Error", "Cannot open Instagram.");
      return;
    }

    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading gym...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gymId || !gym) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerPad}>
          <Text style={styles.emptyTitle}>Gym not available</Text>
          <Text style={styles.emptyText}>
            This screen needs gym data from search or memberships.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
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
          <Ionicons name="chevron-back" size={18} color="#ffd700" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Gym Profile</Text>
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.locationText}>
                {location || "Location not set"}
              </Text>
            </View>

            {!!statusLabel && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusLabel}</Text>
              </View>
            )}
          </View>

          <Text style={styles.bioText}>
            {gym.bio?.trim() || "No gym bio provided."}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact & Links</Text>

          <View style={styles.linkList}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#ffd700" />
              <Text style={styles.infoText}>{location || "Not provided"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.infoRow, !gym.website && styles.disabledRow]}
              activeOpacity={gym.website ? 0.85 : 1}
              onPress={gym.website ? openWebsite : undefined}
            >
              <Ionicons name="globe-outline" size={18} color="#ffd700" />
              <Text style={styles.infoText}>
                {gym.website?.trim() || "No website"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoRow, !gym.instagram && styles.disabledRow]}
              activeOpacity={gym.instagram ? 0.85 : 1}
              onPress={gym.instagram ? openInstagram : undefined}
            >
              <Ionicons name="logo-instagram" size={18} color="#ffd700" />
              <Text style={styles.infoText}>
                {gym.instagram?.trim() || "No Instagram"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Membership</Text>

          {membership?.status === "active" ? (
            <View style={styles.passiveBox}>
              <Text style={styles.passiveTitle}>You are already a member.</Text>
              <Text style={styles.passiveText}>
                This gym has already accepted you as an active fighter member.
              </Text>
            </View>
          ) : membership?.status === "pending" ? (
            <>
              <View style={styles.passiveBox}>
                <Text style={styles.passiveTitle}>Request pending.</Text>
                <Text style={styles.passiveText}>
                  Your request is waiting for a coach or owner to review it.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.dangerBtn, busy && styles.disabledBtn]}
                activeOpacity={0.85}
                onPress={handleCancel}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.dangerBtnText}>Cancel Request</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.helperText}>
                Interested in training here? Send a join request and wait for
                approval.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.disabledBtn]}
                activeOpacity={0.85}
                onPress={handleJoin}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#0b0b0b" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Request to Join</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Next Steps</Text>

          <TouchableOpacity
            style={styles.linkAction}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FighterGymSearchScreen")}
          >
            <Text style={styles.linkActionTitle}>Browse more gyms</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffd700" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkAction}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FighterGymMembershipsScreen")}
          >
            <Text style={styles.linkActionTitle}>View my memberships</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffd700" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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

  centerPad: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    alignSelf: "flex-start",
  },

  backText: {
    color: "#ffd700",
    fontWeight: "800",
    fontSize: 14,
  },

  heroCard: {
    backgroundColor: "#121212",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
    marginBottom: 16,
  },

  heroTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  eyebrow: {
    color: "#ffd700",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  gymName: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },

  locationText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  bioText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    lineHeight: 21,
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

  sectionCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },

  linkList: {
    gap: 12,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 12,
  },

  disabledRow: {
    opacity: 0.55,
  },

  infoText: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
  },

  passiveBox: {
    backgroundColor: "#171717",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  passiveTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
    marginBottom: 6,
  },

  passiveText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 19,
  },

  helperText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  primaryBtn: {
    backgroundColor: "#ffd700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  primaryBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  dangerBtn: {
    backgroundColor: "#2a1111",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.25)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  dangerBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  linkAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  linkActionTitle: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  emptyTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },

  emptyText: {
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
});

export default GymDetailScreen;
