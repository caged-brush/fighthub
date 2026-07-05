import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

const CATEGORIES = [
  { key: "account", label: "Account & login" },
  { key: "report", label: "Report a user" },
  { key: "billing", label: "Billing" },
  { key: "bug", label: "Something's broken" },
  { key: "other", label: "Other" },
];

const ContactSupport = () => {
  const navigation = useNavigation();
  const { userId, userToken } = useContext(AuthContext);

  const [category, setCategory] = useState("account");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    if (!message.trim()) {
      Alert.alert("Add a message", "Let us know what's going on before sending.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({
          userId,
          category,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send");
      }

      setSent(true);
      setMessage("");
    } catch (e) {
      // No backend route yet — fall back to a clear message rather than a
      // silent failure. Wire this up to a real /support-tickets endpoint,
      // or swap for a mailto: link, once one exists.
      Alert.alert(
        "Couldn't send",
        "Support isn't wired up yet. In the meantime, email us directly at support@kavyx.tech.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Contact support" onBack={() => navigation.goBack()} />
        <View style={styles.sentWrap}>
          <View style={styles.sentIcon}>
            <Ionicons name="checkmark" size={28} color="#0B0B0C" />
          </View>
          <Text style={styles.sentTitle}>Message sent</Text>
          <Text style={styles.sentText}>
            We usually reply within 1–2 business days.
          </Text>
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Contact support" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Tell us what's going on — we read every message.
            </Text>

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryChip,
                      active && styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        active && styles.categoryChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textarea}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe the issue, including any profile or message links if relevant..."
              placeholderTextColor="rgba(245,241,232,0.32)"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#0B0B0C" />
              ) : (
                <Text style={styles.submitText}>Send message</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
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
    marginBottom: 20,
  },

  label: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.12)",
    backgroundColor: "#151515",
  },
  categoryChipActive: {
    borderColor: "#E8B84B",
    backgroundColor: "rgba(232,184,75,0.12)",
  },
  categoryChipText: {
    color: "rgba(245,241,232,0.6)",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: "#E8B84B",
  },

  textarea: {
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.10)",
    padding: 14,
    color: "#F5F1E8",
    fontSize: 15,
    minHeight: 140,
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

  sentWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A9F6E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  sentTitle: {
    color: "#F5F1E8",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  sentText: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
});

export default ContactSupport;