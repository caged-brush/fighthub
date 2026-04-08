import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

type RootNav = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

type StatItem = {
  label: string;
  value: number;
  helper: string;
};

type FighterItem = {
  id: string;
  name: string;
  meta: string;
  status: string;
};

type RequestItem = {
  id: string;
  name: string;
  meta: string;
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

type FighterRowProps = {
  name: string;
  meta: string;
  status?: string;
  onPress: () => void;
};

type AuthContextShape = {
  logout?: () => Promise<void> | void;
};

const CoachDashboard = () => {
  const navigation = useNavigation<RootNav>();
  const { logout } = useContext(AuthContext) as AuthContextShape;

  const coachName = "Professor Chad";
  const gymName = "Iron Forge MMA";

  const stats = useMemo<StatItem[]>(
    () => [
      { label: "Roster", value: 12, helper: "Active fighters" },
      { label: "Requests", value: 4, helper: "Pending join requests" },
      { label: "Bookings", value: 3, helper: "Upcoming opportunities" },
    ],
    [],
  );

  const fighters = useMemo<FighterItem[]>(
    () => [
      {
        id: "1",
        name: "David Mensah",
        meta: "Amateur • Lightweight • 5-1-0",
        status: "Ready",
      },
      {
        id: "2",
        name: "Isaac Bello",
        meta: "Amateur • Welterweight • 3-2-0",
        status: "Needs review",
      },
      {
        id: "3",
        name: "Nathan Cole",
        meta: "Pro • Featherweight • 8-3-0",
        status: "Booked",
      },
    ],
    [],
  );

  const requests = useMemo<RequestItem[]>(
    () => [
      {
        id: "r1",
        name: "Samuel Grant",
        meta: "Requested to join • Middleweight",
      },
      {
        id: "r2",
        name: "Ali Karim",
        meta: "Requested to join • Bantamweight",
      },
    ],
    [],
  );

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Kavyx Coach</Text>
            <Text style={styles.headline}>Run your roster properly.</Text>
            <Text style={styles.subhead}>
              Manage your gym, review fighters, and stay ready for
              opportunities.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profilePill}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("UserProfile")}
          >
            <Text style={styles.profilePillText}>{coachName}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gymCard}>
          <Text style={styles.gymLabel}>GYM</Text>
          <Text style={styles.gymName}>{gymName}</Text>
          <Text style={styles.gymMeta}>
            Your fighters need structure, visibility, and fast decisions.
          </Text>

          <View style={styles.gymActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("CoachSetupScreen")}
            >
              <Text style={styles.primaryBtnText}>Manage Gym</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Roster")}
            >
              <Text style={styles.secondaryBtnText}>View Roster</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((item) => (
            <StatCard
              key={item.label}
              label={item.label}
              value={item.value}
              helper={item.helper}
            />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
          </View>

          <View style={styles.quickGrid}>
            <QuickAction
              title="Add Fighter"
              subtitle="Create or connect a fighter profile"
              onPress={() => navigation.navigate("Roster")}
            />
            <QuickAction
              title="Review Requests"
              subtitle="Approve or reject gym requests"
              onPress={() => navigation.navigate("CoachRequests")}
            />
            <QuickAction
              title="Messages"
              subtitle="Talk to fighters and scouts"
              onPress={() => navigation.navigate("ChatScreen")}
            />
            <QuickAction
              title="Gym Setup"
              subtitle="Update your gym information"
              onPress={() => navigation.navigate("CoachSetupScreen")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Roster preview</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Roster")}
            >
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {fighters.map((fighter, index) => (
              <View
                key={fighter.id}
                style={[
                  styles.rowWrap,
                  index !== fighters.length - 1 && styles.rowDivider,
                ]}
              >
                <FighterRow
                  name={fighter.name}
                  meta={fighter.meta}
                  status={fighter.status}
                  onPress={() =>
                    navigation.navigate("UserProfile", { userId: fighter.id })
                  }
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending requests</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate("CoachRequests")}
            >
              <Text style={styles.sectionLink}>Review</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests.</Text>
            ) : (
              requests.map((request, index) => (
                <TouchableOpacity
                  key={request.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("CoachRequests", {
                      requestId: request.id,
                    })
                  }
                  style={[
                    styles.requestRow,
                    index !== requests.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{request.name}</Text>
                    <Text style={styles.rowMeta}>{request.meta}</Text>
                  </View>

                  <View style={styles.requestBadge}>
                    <Text style={styles.requestBadgeText}>Pending</Text>
                  </View>
                </TouchableOpacity>
              ))
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

function FighterRow({ name, meta, status, onPress }: FighterRowProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>

      {!!status && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{status}</Text>
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

  sectionLink: {
    color: "#4da3ff",
    fontWeight: "800",
    fontSize: 13,
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

  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  requestBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  requestBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
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
