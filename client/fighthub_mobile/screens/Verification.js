import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

// Placeholder status until a real verification endpoint exists.
// Swap this for a value fetched from the user's record.
const VERIFICATION_STATUS = "unverified"; // "unverified" | "pending" | "verified"

const STATUS_META = {
  unverified: {
    color: "rgba(245,241,232,0.4)",
    label: "Not verified",
    icon: "ellipse-outline",
  },
  pending: {
    color: "#E8B84B",
    label: "Pending review",
    icon: "time-outline",
  },
  verified: {
    color: "#4A9F6E",
    label: "Verified",
    icon: "checkmark-circle",
  },
};

const REQUIREMENTS = {
  fighter: [
    "A government-issued photo ID",
    "A recent photo of yourself for comparison",
    "Your current gym or coach's contact info (optional, speeds up review)",
  ],
  scout: [
    "A government-issued photo ID",
    "Proof of affiliation with a promotion or organization",
  ],
  coach: [
    "A government-issued photo ID",
    "Proof you coach at a registered gym",
  ],
};

const Verification = () => {
  const navigation = useNavigation();
  const { role } = useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);

  const status = STATUS_META[VERIFICATION_STATUS];
  const requirements = REQUIREMENTS[role] || REQUIREMENTS.fighter;

  const handleRequestVerification = () => {
    setSubmitting(true);
    // No backend endpoint yet — this is a stub.
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        "Not yet available",
        "Verification requests aren't wired up yet. Contact support to get verified in the meantime.",
      );
    }, 400);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Verification" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name={status.icon} size={20} color={status.color} />
            <Text style={[styles.statusLabel, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Text style={styles.statusText}>
            Verified accounts get a badge on their profile and appear higher in
            scout and coach searches.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What you'll need</Text>
        <View style={styles.card}>
          {requirements.map((req, i) => (
            <View
              key={req}
              style={[
                styles.reqRow,
                i === requirements.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.reqDot} />
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          Verification usually takes 1–3 business days. You'll get a
          notification once it's reviewed.
        </Text>

        {VERIFICATION_STATUS === "unverified" && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleRequestVerification}
          >
            <Text style={styles.submitText}>
              {submitting ? "Requesting..." : "Request verification"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#F5F1E8" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#F5F1E8", fontSize: 16, fontWeight: "800" },

  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  statusCard: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    padding: 16,
    marginBottom: 22,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusLabel: { fontSize: 15, fontWeight: "800" },
  statusText: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 13,
    lineHeight: 19,
  },

  sectionLabel: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,241,232,0.07)",
  },
  reqDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E8B84B",
    marginTop: 7,
  },
  reqText: {
    color: "#F5F1E8",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  note: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 24,
  },

  submitBtn: {
    backgroundColor: "#E8B84B",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#0B0B0C", fontWeight: "800", fontSize: 16 },
});

export default Verification;
