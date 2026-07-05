import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

/**
 * NOTE: This is placeholder conduct-policy copy so the screen isn't empty.
 * Have an actual lawyer draft or review real Terms of Service / conduct
 * policy language before this ships — the text below is not legal advice
 * and shouldn't be treated as a binding agreement as-is.
 */

const SECTIONS = [
  {
    title: "Respectful conduct",
    body: "Kavyx connects fighters, scouts, and coaches. Harassment, hate speech, threats, or discriminatory behavior toward any user is not tolerated and can result in account suspension or removal.",
  },
  {
    title: "Accurate profiles",
    body: "Fighters must represent their record, weight class, and fight history accurately. Misrepresenting your record, credentials, or affiliation with a gym or promotion may result in account removal.",
  },
  {
    title: "Content standards",
    body: "Clips and photos must be your own footage and depict real training or competition. Staged footage presented as a real bout, or content involving other people without their consent, will be removed.",
  },
  {
    title: "Messaging",
    body: "Messages between fighters, scouts, and coaches should relate to matchmaking, gym affiliation, or professional opportunities. Unsolicited commercial spam or repeated unwanted contact can be reported and will be reviewed.",
  },
  {
    title: "Reporting violations",
    body: "If you encounter behavior that violates this policy, use Contact Support with details of the profile or message in question. Reports are reviewed and accounts found in violation may be warned, restricted, or removed.",
  },
  {
    title: "Account eligibility",
    body: "You must be old enough to legally enter into an agreement in your jurisdiction to create an account. Coaches and scouts affiliated with a gym or promotion may be asked to verify that affiliation.",
  },
];

const Terms = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Terms & conduct policy"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated · placeholder draft</Text>

        <Text style={styles.intro}>
          These guidelines outline what's expected of everyone on Kavyx —
          fighters, scouts, and coaches alike. Using the app means agreeing to
          follow them.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="rgba(245,241,232,0.4)"
          />
          <Text style={styles.footerNoteText}>
            Questions about this policy? Reach out through Contact Support.
          </Text>
        </View>
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

  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },

  updated: {
    color: "rgba(245,241,232,0.35)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  intro: {
    color: "rgba(245,241,232,0.6)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },

  section: { marginBottom: 22 },
  sectionTitle: {
    color: "#F5F1E8",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionBody: {
    color: "rgba(245,241,232,0.6)",
    fontSize: 14,
    lineHeight: 21,
  },

  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,241,232,0.07)",
  },
  footerNoteText: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});

export default Terms;
