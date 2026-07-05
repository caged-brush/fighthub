import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

/**
 * Design tokens
 * -------------
 * bg        #0B0B0C  near-black, matches existing app shell
 * surface   #151515  card base
 * hairline  rgba(245,241,232,0.09)
 * ink       #F5F1E8  warm bone-white (not pure white — softer, poster-like)
 * ink/60    rgba(245,241,232,0.60)
 * ink/30    rgba(245,241,232,0.30)
 * corner-red   #D6473F   (fighter)
 * corner-gold  #D9A441   (scout)
 * corner-blue  #4A7FA7   (coach)
 *
 * Signature: each role reads as a "corner" in a bout — a numbered ticket stub
 * with a solid corner-color tag, a single-letter corner mark, and a torn/
 * perforated seam before the CTA, like tearing a fight-night ticket.
 */

const Welcome = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>MATCHMAKING PLATFORM</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.brand}>KAVYX</Text>
          <Text style={styles.headline}>Get discovered.{"\n"}Book faster.</Text>
          <Text style={styles.subhead}>
            A clean hub for fighters, scouts, and coaches to connect without the
            noise.
          </Text>
        </View>

        <View style={styles.roleGrid}>
          <RoleCard
            bout="01"
            letter="F"
            corner="RED CORNER"
            title="I'm a Fighter"
            description="Build your profile. Post clips. Get matched."
            accent="red"
            onPress={() => navigation.navigate("Signup", { role: "fighter" })}
          />

          <RoleCard
            bout="02"
            letter="S"
            corner="GOLD CORNER"
            title="I'm a Scout"
            description="Filter talent fast. Message verified fighters."
            accent="gold"
            onPress={() => navigation.navigate("Signup", { role: "scout" })}
          />

          <RoleCard
            bout="03"
            letter="C"
            corner="BLUE CORNER"
            title="I'm a Coach"
            description="Manage your gym. Build your roster. Represent your fighters."
            accent="blue"
            onPress={() => navigation.navigate("Signup", { role: "coach" })}
          />
        </View>

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

        <Text style={styles.footer}>
          By continuing, you agree to respectful conduct on Kavyx.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

type RoleAccent = "red" | "gold" | "blue";

interface RoleCardProps {
  bout: string;
  letter: string;
  corner: string;
  title: string;
  description: string;
  accent: RoleAccent;
  onPress: () => void;
}

const ACCENTS: Record<RoleAccent, { solid: string; wash: string }> = {
  red: { solid: "#D6473F", wash: "rgba(214,71,63,0.08)" },
  gold: { solid: "#D9A441", wash: "rgba(217,164,65,0.08)" },
  blue: { solid: "#4A7FA7", wash: "rgba(74,127,167,0.08)" },
};

function RoleCard({
  bout,
  letter,
  corner,
  title,
  description,
  accent,
  onPress,
}: RoleCardProps) {
  const a = ACCENTS[accent];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: a.wash }]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cornerTagRow}>
          <View style={[styles.letterBadge, { backgroundColor: a.solid }]}>
            <Text style={styles.letterBadgeText}>{letter}</Text>
          </View>
          <Text style={[styles.cornerLabel, { color: a.solid }]}>{corner}</Text>
        </View>
        <Text style={styles.boutLabel}>BOUT {bout}</Text>
      </View>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>

      {/* torn ticket seam */}
      <View style={styles.seamRow}>
        <View style={styles.seamNotchLeft} />
        <View style={styles.seamLine} />
        <View style={styles.seamNotchRight} />
      </View>

      <View style={styles.ctaRow}>
        <Text style={[styles.ctaText, { color: a.solid }]}>Continue</Text>
        <Text style={[styles.ctaArrow, { color: a.solid }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0B0C",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 26 : 12,
    paddingBottom: 32,
    justifyContent: "center",
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D6473F",
    marginRight: 8,
  },
  eyebrow: {
    color: "rgba(245,241,232,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
  },

  header: {
    marginBottom: 28,
  },
  brand: {
    color: "#F5F1E8",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 14,
    opacity: 0.9,
  },
  headline: {
    color: "#E8B84B",
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 41,
    marginBottom: 14,
    letterSpacing: -0.8,
  },
  subhead: {
    color: "rgba(245,241,232,0.60)",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },

  roleGrid: {
    gap: 12,
    marginBottom: 6,
  },

  card: {
    borderRadius: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cornerTagRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  letterBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  letterBadgeText: {
    color: "#0B0B0C",
    fontSize: 13,
    fontWeight: "900",
  },
  cornerLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  boutLabel: {
    color: "rgba(245,241,232,0.28)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  cardTitle: {
    color: "#F5F1E8",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardDesc: {
    color: "rgba(245,241,232,0.62)",
    fontSize: 14,
    lineHeight: 20,
  },

  seamRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  seamNotchLeft: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0B0B0C",
    marginLeft: -20,
  },
  seamLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(245,241,232,0.16)",
    marginHorizontal: 4,
  },
  seamNotchRight: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0B0B0C",
    marginRight: -20,
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    fontWeight: "800",
    fontSize: 14,
  },
  ctaArrow: {
    fontSize: 18,
    fontWeight: "900",
  },

  loginWrap: {
    alignItems: "center",
    marginTop: 22,
  },
  loginText: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 14,
  },
  loginLink: {
    color: "#F5F1E8",
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  footer: {
    textAlign: "center",
    marginTop: 14,
    color: "rgba(245,241,232,0.28)",
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Welcome;
