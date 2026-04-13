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

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

type MembershipCardProps = {
  item: FighterGymMembershipRow;
  onBrowseGyms: () => void;
  onOpenGym: () => void;
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

const FighterGymMembershipsScreen = () => {
  const navigation = useNavigation<RootNav>();
  const { userToken } = useContext(AuthContext) as AuthContextShape;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberships, setMemberships] = useState<FighterGymMembershipRow[]>([]);

  const activeMemberships = useMemo(
    () => memberships.filter((m) => m.status === "active"),
    [memberships],
  );

  const pendingMemberships = useMemo(
    () => memberships.filter((m) => m.status === "pending"),
    [memberships],
  );

  const historyMemberships = useMemo(
    () =>
      memberships.filter(
        (m) => m.status === "rejected" || m.status === "revoked",
      ),
    [memberships],
  );

  const loadMemberships = useCallback(async () => {
    if (!userToken) {
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
      setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
    } catch (e: any) {
      console.log("Fighter memberships load error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load memberships.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMemberships();
  }, [loadMemberships]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading memberships...</Text>
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
        <Text style={styles.headline}>Your gym memberships.</Text>
        <Text style={styles.subhead}>
          Track where you belong, what’s pending, and what got rejected.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("FighterGymSearchScreen")}
        >
          <Text style={styles.primaryBtnText}>Browse Gyms</Text>
        </TouchableOpacity>

        <View style={styles.topStatsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>{activeMemberships.length}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{pendingMemberships.length}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>History</Text>
            <Text style={styles.statValue}>{historyMemberships.length}</Text>
          </View>
        </View>

        <SectionCard
          title="Active memberships"
          subtitle="Gyms where you are currently an active member."
        >
          {activeMemberships.length === 0 ? (
            <EmptyState text="No active gym memberships yet." />
          ) : (
            activeMemberships.map((item) => (
              <MembershipCard
                key={item.id}
                item={item}
                onBrowseGyms={() =>
                  navigation.navigate("FighterGymSearchScreen")
                }
                onOpenGym={() =>
                  navigation.navigate("GymDetailScreen", {
                    gym: item.gyms,
                    gymId: item.gym_id,
                  })
                }
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Pending requests"
          subtitle="Requests waiting for a coach or gym owner to review."
        >
          {pendingMemberships.length === 0 ? (
            <EmptyState text="No pending gym requests." />
          ) : (
            pendingMemberships.map((item) => (
              <MembershipCard
                key={item.id}
                item={item}
                onBrowseGyms={() =>
                  navigation.navigate("FighterGymSearchScreen")
                }
                onOpenGym={() =>
                  navigation.navigate("GymDetailScreen", {
                    gym: item.gyms,
                    gymId: item.gym_id,
                  })
                }
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="History"
          subtitle="Previous outcomes for past gym requests or memberships."
        >
          {historyMemberships.length === 0 ? (
            <EmptyState text="No rejected or revoked memberships." />
          ) : (
            historyMemberships.map((item) => (
              <MembershipCard
                key={item.id}
                item={item}
                onBrowseGyms={() =>
                  navigation.navigate("FighterGymSearchScreen")
                }
                onOpenGym={() =>
                  navigation.navigate("GymDetailScreen", {
                    gym: item.gyms,
                    gymId: item.gym_id,
                  })
                }
              />
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
};

function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function MembershipCard({
  item,
  onBrowseGyms,
  onOpenGym,
}: MembershipCardProps) {
  const gym = item.gyms;
  const location = [gym?.city, gym?.region, gym?.country]
    .filter(Boolean)
    .join(", ");

  const statusLabel =
    item.status === "active"
      ? "Active"
      : item.status === "pending"
        ? "Pending"
        : item.status === "rejected"
          ? "Rejected"
          : "Revoked";

  return (
    <TouchableOpacity
      style={styles.membershipCard}
      activeOpacity={0.85}
      onPress={onOpenGym}
    >
      <View style={styles.membershipHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gymName}>{gym?.name || "Unknown Gym"}</Text>
          <Text style={styles.gymMeta}>{location || "Location not set"}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View
            style={[
              styles.statusBadge,
              item.status === "active" && styles.statusBadgeActive,
              item.status === "pending" && styles.statusBadgePending,
              item.status === "rejected" && styles.statusBadgeRejected,
              item.status === "revoked" && styles.statusBadgeRevoked,
            ]}
          >
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.gymBio}>
        {gym?.bio?.trim() || "No gym bio provided."}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.roleText}>Role: {item.role}</Text>

        <View style={styles.footerActions}>
          <TouchableOpacity activeOpacity={0.85} onPress={onBrowseGyms}>
            <Text style={styles.linkText}>Browse more gyms</Text>
          </TouchableOpacity>

          <Text style={styles.linkDivider}>•</Text>

          <TouchableOpacity activeOpacity={0.85} onPress={onOpenGym}>
            <Text style={styles.linkText}>Open gym</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>{text}</Text>
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

  primaryBtn: {
    backgroundColor: "#ffd700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 18,
  },

  primaryBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  topStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  linkDivider: {
    color: "rgba(255,255,255,0.35)",
    fontWeight: "900",
  },

  statLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },

  section: {
    marginBottom: 18,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },

  sectionSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  sectionCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },

  membershipCard: {
    backgroundColor: "#171717",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  membershipHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },

  gymName: {
    color: "#ffffff",
    fontSize: 17,
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
    marginBottom: 12,
  },

  statusBadge: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusBadgeActive: {
    backgroundColor: "rgba(50,205,50,0.12)",
    borderColor: "rgba(50,205,50,0.25)",
  },

  statusBadgePending: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.25)",
  },

  statusBadgeRejected: {
    backgroundColor: "rgba(255,90,90,0.12)",
    borderColor: "rgba(255,90,90,0.25)",
  },

  statusBadgeRevoked: {
    backgroundColor: "rgba(160,160,160,0.12)",
    borderColor: "rgba(160,160,160,0.25)",
  },

  statusBadgeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roleText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "700",
  },

  linkText: {
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "800",
  },

  emptyWrap: {
    paddingVertical: 10,
  },

  emptyText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FighterGymMembershipsScreen;
