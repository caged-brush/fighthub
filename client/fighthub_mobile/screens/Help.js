import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    q: "How do I get discovered by scouts?",
    a: "Complete your fighter profile with your weight class, record, and gym, then post clips. Scouts filter by weight class and region, so the more complete your profile, the more likely you'll show up in searches.",
  },
  {
    q: "What does verification do?",
    a: "Verified accounts get a badge on their profile and rank higher in search results. It's a quick check that confirms you are who your profile says you are.",
  },
  {
    q: "How do I apply to an open fight slot?",
    a: "Open a listing from the Fight Board and tap Continue. You'll need a complete profile and to meet the weight class before you can apply.",
  },
  {
    q: "Can I switch roles after signing up?",
    a: "Not directly from your existing account yet. Contact support and we can help move you to a different role.",
  },
  {
    q: "How do I report inappropriate behavior?",
    a: "Use Contact Support and include the user's profile or the specific message. We review every report and can restrict or remove accounts that violate our conduct policy.",
  },
  {
    q: "Why was my post removed?",
    a: "Posts are removed if they violate our conduct policy — this includes staged footage misrepresented as a real bout, or content involving anyone other than yourself without consent.",
  },
];

const Help = () => {
  const navigation = useNavigation();
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Help center" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Common questions about using Kavyx. Can't find what you need?
        </Text>

        <TouchableOpacity
          style={styles.contactLink}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("ContactSupport")}
        >
          <Ionicons name="mail-outline" size={16} color="#E8B84B" />
          <Text style={styles.contactLinkText}>Contact support directly</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <View key={item.q}>
                <TouchableOpacity
                  style={[
                    styles.faqRow,
                    i === FAQS.length - 1 && !open && { borderBottomWidth: 0 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggle(i)}
                >
                  <Text style={styles.faqQ}>{item.q}</Text>
                  <Ionicons
                    name={open ? "remove" : "add"}
                    size={18}
                    color="#E8B84B"
                  />
                </TouchableOpacity>

                {open && (
                  <View
                    style={[
                      styles.faqAWrap,
                      i === FAQS.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={styles.faqA}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
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

  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  subtitle: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },

  contactLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  contactLinkText: {
    color: "#E8B84B",
    fontWeight: "700",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    paddingHorizontal: 16,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,241,232,0.07)",
    gap: 12,
  },
  faqQ: {
    color: "#F5F1E8",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  faqAWrap: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,241,232,0.07)",
  },
  faqA: {
    color: "rgba(245,241,232,0.6)",
    fontSize: 13,
    lineHeight: 19,
  },
});

export default Help;
