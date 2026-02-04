import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const Welcome = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top: Brand + value prop */}
        <View style={styles.header}>
          <Text style={styles.brand}>Kavyx</Text>
          <Text style={styles.headline}>Get discovered. Book faster.</Text>
          <Text style={styles.subhead}>
            A clean hub for fighters and scouts to connect without the noise.
          </Text>
        </View>

        {/* Middle: Role 선택 */}
        <View style={styles.roleGrid}>
          <RoleCard
            title="I’m a Fighter"
            description="Build your profile. Post clips. Get matched."
            accent="pink"
            onPress={() => navigation.navigate("Signup", { role: "fighter" })}
          />
          <RoleCard
            title="I’m a Scout"
            description="Filter talent fast. Message verified fighters."
            accent="gold"
            onPress={() => navigation.navigate("Signup", { role: "scout" })}
          />
        </View>

        {/* Bottom: Login */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
          style={styles.loginWrap}
        >
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>

        {/* Tiny footer */}
        <Text style={styles.footer}>
          By continuing, you agree to respectful conduct on Kavyx.
        </Text>
      </View>
    </SafeAreaView>
  );
};

function RoleCard({ title, description, accent, onPress }) {
  const accentStyle =
    accent === "pink" ? { borderColor: "#e0245e" } : { borderColor: "#ffd700" };

  const badgeStyle =
    accent === "pink"
      ? { backgroundColor: "rgba(224,36,94,0.14)", color: "#ff4f86" }
      : { backgroundColor: "rgba(255,215,0,0.12)", color: "#ffd700" };

  const badgeText = accent === "pink" ? "FIGHTER" : "SCOUT";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, accentStyle]}
    >
      <Text
        style={[
          styles.badge,
          {
            color: badgeStyle.color,
            backgroundColor: badgeStyle.backgroundColor,
          },
        ]}
      >
        {badgeText}
      </Text>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>Continue</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 0,
    justifyContent: "center",
  },

  header: {
    alignItems: "flex-start",
    marginBottom: 18,
  },
  brand: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.4,
    opacity: 0.9,
    marginBottom: 10,
  },
  headline: {
    color: "#ffd700",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    marginBottom: 10,
  },
  subhead: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 340,
  },

  roleGrid: {
    gap: 14,
    marginTop: 10,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#121212",
    borderWidth: 1.5,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  ctaText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
    fontSize: 14,
  },
  ctaArrow: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    fontWeight: "900",
  },

  loginWrap: {
    alignItems: "center",
    marginTop: 18,
  },
  loginText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  loginLink: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  footer: {
    textAlign: "center",
    marginTop: 12,
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Welcome;
