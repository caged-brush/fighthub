import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type RootNav = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

type AuthContextShape = {
  logout?: () => Promise<void> | void;
  userToken?: string | null;
};

type Gym = {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  logo_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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

type RequestsResponse = {
  requests: MembershipItem[];
};

type RosterResponse = {
  roster: MembershipItem[];
};

type QuickActionProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

type MemberRowProps = {
  name: string;
  meta: string;
  badge?: string;
  onPress?: () => void;
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

const CoachDashboard = () => {
  const navigation = useNavigation<RootNav>();
  const { logout, userToken } = useContext(AuthContext) as AuthContextShape;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [memberships, setMemberships] = useState<DashboardGymMembership[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [roster, setRoster] = useState<MembershipItem[]>([]);
  const [requests, setRequests] = useState<MembershipItem[]>([]);

  const selectedMembership = useMemo(() => {
    return memberships.find((m) => m.gym_id === selectedGymId) || null;
  }, [memberships, selectedGymId]);

  const selectedGym = selectedMembership?.gyms || null;

  const loadGymDetails = useCallback(
    async (gymId: string, token: string) => {
      const [rosterRes, requestsRes] = await Promise.all([
        fetch(`${API_URL}/coach/gyms/${gymId}/roster`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/coach/gyms/${gymId}/requests`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const rosterData = await parseJsonResponse<RosterResponse>(rosterRes);
      const requestsData = await parseJsonResponse<RequestsResponse>(requestsRes);

      setRoster(Array.isArray(rosterData.roster) ? rosterData.roster : []);
      setRequests(Array.isArray(requestsData.requests) ? requestsData.requests : []);
    },
    []
  );

  const loadDashboard = useCallback(async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const dashboardRes = await fetch(`${API_URL}/coach/dashboard`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const dashboardData = await parseJsonResponse<DashboardResponse>(dashboardRes);
      const gyms = Array.isArray(dashboardData.gyms) ? dashboardData.gyms : [];

      setMemberships(gyms);

      const nextGymId =
        selectedGymId && gyms.some((g) => g.gym_id === selectedGymId)
          ? selectedGymId
          : gyms[0]?.gym_id || null;

      setSelectedGymId(nextGymId);

      if (!nextGymId) {
        setRoster([]);
        setRequests([]);
        return;
      }

      await loadGymDetails(nextGymId, userToken);
    } catch (e: any) {
      console.log("Coach dashboard error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to load coach dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadGymDetails, selectedGymId, userToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!userToken || !selectedGymId || loading) return;
    loadGymDetails(selectedGymId, userToken).catch((e: any) => {
      console.log("Coach dashboard gym switch error:", e?.message || e);
    });
  }, [selectedGymId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
  };

  const rosterCount = roster.filter((item) => item.status === "active").length;
  const pendingCount = requests.length;
  const gymsCount = memberships.length;

  const gymLocation = [
    selectedGym?.city?.trim(),
    selectedGym?.region?.trim(),
    selectedGym?.country?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading coach dashboard...</Text>
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
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>Kavyx Coach</Text>
              <Text style={styles.headline}>No gym yet.</Text>
              <Text style={styles.subhead}>
                Create your first gym to start managing roster and requests.
              </Text>
            </View>
          </View>

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>You have no active gym memberships.</Text>
            <Text style={styles.emptyText}>
              Use gym setup to create your gym first. Until then, this dashboard
              has nothing real to show.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("CoachSetupScreen")}
            >
              <Text style={styles.primaryBtnText}>Create Gym</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
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
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Kavyx Coach</Text>
            <Text style={styles.headline}>Run your gym properly.</Text>
            <Text style={styles.subhead}>
              Manage real roster data, real requests, and keep your gym organized.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profilePill}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate("CoachSetupScreen", { gymId: selectedGym.id })
            }
          >
            <Text style={styles.profilePillText}>
              {(selectedMembership?.role || "coach").toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {memberships.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your gyms</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gymSwitcherRow}
            >
              {memberships.map((membership) => {
                const gym = membership.gyms;
                const active = membership.gym_id === selectedGymId;

                return (
                  <TouchableOpacity
                    key={membership.gym_id}
                    activeOpacity={0.85}
                    style={[styles.gymChip, active && styles.gymChipActive]}
                    onPress={() => setSelectedGymId(membership.gym_id)}
                  >
                    <Text
                      style={[
                        styles.gymChipText,
                        active && styles.gymChipTextActive,
                      ]}
                    >
                      {gym?.name || "Unnamed Gym"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.gymCard}>
          <Text style={styles.gymLabel}>GYM</Text>
          <Text style={styles.gymName}>{selectedGym.name}</Text>
          <Text style={styles.gymMeta}>
            {selectedGym.bio?.trim() ||
              "No gym bio yet. Update your gym details so people know this place is real."}
          </Text>

          <Text style={styles.locationText}>{gymLocation || "Location not set"}</Text>

          <View style={styles.gymActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("CoachSetupScreen", { gymId: selectedGym.id })
              }
            >
              <Text style={styles.primaryBtnText}>Manage Gym</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={onRefresh}
            >
              <Text style={styles.secondaryBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Roster" value={rosterCount} helper="Active members" />
          <StatCard label="Requests" value={pendingCount} helper="Pending fighters" />
          <StatCard label="Gyms" value={gymsCount} helper="Managed gyms" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
          </View>

          <View style={styles.quickGrid}>
            <QuickAction
              title="Manage gym"
              subtitle="Update your gym info and setup"
              onPress={() =>
                navigation.navigate("CoachSetupScreen", { gymId: selectedGym.id })
              }
            />
            <QuickAction
              title="Refresh roster"
              subtitle="Pull latest active roster members"
              onPress={onRefresh}
            />
            <QuickAction
              title="Refresh requests"
              subtitle="Pull latest pending join requests"
              onPress={onRefresh}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Roster preview</Text>
          </View>

          <View style={styles.listCard}>
            {roster.length === 0 ? (
              <Text style={styles.emptyText}>No active roster members yet.</Text>
            ) : (
              roster.slice(0, 6).map((member, index) => {
                const displayName =
                  `${member.users?.fname || ""} ${member.users?.lname || ""}`.trim() ||
                  "Unknown user";

                const metaParts = [
                  member.users?.role || null,
                  member.role || null,
                  member.status || null,
                ].filter(Boolean);

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.rowWrap,
                      index !== Math.min(roster.length, 6) - 1 && styles.rowDivider,
                    ]}
                  >
                    <MemberRow
                      name={displayName}
                      meta={metaParts.join(" • ")}
                      badge={member.status}
                      onPress={() =>
                        navigation.navigate("UserProfile", {
                          userId: member.user_id,
                        })
                      }
                    />
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending requests</Text>
          </View>

          <View style={styles.listCard}>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests.</Text>
            ) : (
              requests.slice(0, 6).map((request, index) => {
                const displayName =
                  `${request.users?.fname || ""} ${request.users?.lname || ""}`.trim() ||
                  "Unknown user";

                const metaParts = [
                  request.users?.role || null,
                  request.role || null,
                  request.status || null,
                ].filter(Boolean);

                return (
                  <View
                    key={request.id}
                    style={[
                      styles.rowWrap,
                      index !== Math.min(requests.length, 6) - 1 &&
                        styles.rowDivider,
                    ]}
                  >
                    <MemberRow
                      name={displayName}
                      meta={metaParts.join(" • ")}
                      badge="Pending"
                      onPress={() =>
                        navigation.navigate("UserProfile", {
                          userId: request.user_id,
                        })
                      }
                    />
                  </View>
                );
              })
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

function QuickAction({ title, subtitle, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.quickCard}
      onPress={onPress}
    >
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
      <Text style={styles.quickArrow}>→</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!helper && <Text style={styles.statHelper}>{helper}</Text>}
    </View>
  );
}

function MemberRow({ name, meta, badge, onPress }: MemberRowProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowMeta}>{meta || "—"}</Text>
      </View>

      {!!badge && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{badge}</Text>
        </View>
      )}
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

  header: {
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
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
    maxWidth: 260,
  },

  subhead: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 310,
  },

  profilePill: {
    backgroundColor: "rgba(77,163,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(77,163,255,0.35)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 2,
  },

  profilePillText: {
    color: "#4da3ff",
    fontWeight: "900",
    fontSize: 13,
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

  gymSwitcherRow: {
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
    marginBottom: 16,
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
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  locationText: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 13,
    marginBottom: 16,
  },

  gymActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  primaryBtn: {
    backgroundColor: "#4da3ff",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  primaryBtnText: {
    color: "#0b0b0b",
    fontWeight: "900",
    fontSize: 14,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#171717",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  secondaryBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  statsRow: {
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
    marginBottom: 6,
  },

  statHelper: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 16,
  },

  quickGrid: {
    gap: 10,
  },

  quickCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  quickTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },

  quickSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    maxWidth: "88%",
  },

  quickArrow: {
    color: "#4da3ff",
    fontSize: 18,
    fontWeight: "900",
  },

  listCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  rowWrap: {
    paddingHorizontal: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },

  rowName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },

  rowMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },

  statusBadge: {
    backgroundColor: "rgba(77,163,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(77,163,255,0.24)",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: "#4da3ff",
    fontWeight: "900",
    fontSize: 12,
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
    padding: 16,
    textAlign: "center",
  },

  logoutBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#151515",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default CoachDashboard;