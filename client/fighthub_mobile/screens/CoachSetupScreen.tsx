import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

type CoachProfile = {
  display_name?: string;
  years_experience?: number;
};

type RouteParams = {
  coachProfile?: CoachProfile;
};

type FormState = {
  name: string;
  city: string;
  region: string;
  country: string;
  description: string;
  instagram: string;
  website: string;
};

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
};

type ToggleBtnProps = {
  text: string;
  active: boolean;
  onPress: () => void;
};

const CoachSetupScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userToken, completeOnboarding } = useContext(AuthContext) as {
    userToken: string | null;
    completeOnboarding?: () => Promise<void>;
  };

  const coachProfile: CoachProfile | null =
    (route.params as RouteParams | undefined)?.coachProfile || null;

  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"create" | "later">("create");

  const [form, setForm] = useState<FormState>({
    name: "",
    city: "",
    region: "",
    country: "Canada",
    description: "",
    instagram: "",
    website: "",
  });

  const isValid = useMemo(() => {
    if (mode === "later") return true;

    return (
      form.name.trim().length >= 2 &&
      form.city.trim().length >= 2 &&
      form.region.trim().length >= 2
    );
  }, [form, mode]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const finishFlow = async () => {
    if (completeOnboarding) {
      await completeOnboarding();
    }

    navigation.reset({
      index: 0,
      routes: [{ name: "CoachDashboard" }],
    });
  };

  const handleContinue = async () => {
    if (submitting) return;

    if (!userToken) {
      Alert.alert("Auth error", "You are not logged in.");
      return;
    }

    if (!isValid) {
      Alert.alert(
        "Incomplete gym setup",
        "Add your gym name, city, and region.",
      );
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "later") {
        await finishFlow();
        return;
      }

      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        description: form.description.trim() || null,
        instagram: form.instagram.trim() || null,
        website: form.website.trim() || null,
      };

      const res = await fetch(`${API_URL}/coach/gyms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save gym.");
      }

      console.log("Gym created:", data);

      await finishFlow();
    } catch (e: any) {
      console.log("Setup error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to save gym.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert("Skip gym setup?", "You can create your gym later.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: async () => {
          try {
            setMode("later");
            await finishFlow();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to continue.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Set up your gym</Text>
            <Text style={styles.subtitle}>Give your fighters a real base.</Text>

            {coachProfile && (
              <View style={styles.coachCard}>
                <Text style={styles.coachName}>
                  {coachProfile.display_name || "Coach"}
                </Text>
                <Text style={styles.coachMeta}>
                  {coachProfile.years_experience || 0} years experience
                </Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              <ToggleBtn
                text="Create gym"
                active={mode === "create"}
                onPress={() => setMode("create")}
              />
              <ToggleBtn
                text="Later"
                active={mode === "later"}
                onPress={() => setMode("later")}
              />
            </View>

            {mode === "create" && (
              <View style={styles.card}>
                <Input
                  label="Gym name"
                  value={form.name}
                  onChange={(value: string) => handleChange("name", value)}
                />
                <Input
                  label="City"
                  value={form.city}
                  onChange={(value: string) => handleChange("city", value)}
                />
                <Input
                  label="Region"
                  value={form.region}
                  onChange={(value: string) => handleChange("region", value)}
                />
                <Input
                  label="Country"
                  value={form.country}
                  onChange={(value: string) => handleChange("country", value)}
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(value: string) =>
                    handleChange("description", value)
                  }
                  multiline
                />
                <Input
                  label="Instagram"
                  value={form.instagram}
                  onChange={(value: string) => handleChange("instagram", value)}
                  autoCapitalize="none"
                />
                <Input
                  label="Website"
                  value={form.website}
                  onChange={(value: string) => handleChange("website", value)}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primary, !isValid && styles.disabled]}
              onPress={handleContinue}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.primaryText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Input = ({
  label,
  value,
  onChange,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
}: InputProps) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textarea]}
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor="#666"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
  </View>
);

const ToggleBtn = ({ text, active, onPress }: ToggleBtnProps) => (
  <TouchableOpacity
    style={[styles.toggle, active && styles.toggleActive]}
    onPress={onPress}
  >
    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
      {text}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  container: { padding: 20 },

  title: { color: "#4da3ff", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#aaa", marginBottom: 16 },

  coachCard: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  coachName: { color: "#fff", fontWeight: "900" },
  coachMeta: { color: "#aaa" },

  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 16 },

  toggle: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
  },

  toggleActive: {
    backgroundColor: "#4da3ff20",
    borderColor: "#4da3ff",
    borderWidth: 1,
  },

  toggleText: { color: "#aaa" },
  toggleTextActive: { color: "#4da3ff" },

  card: {
    backgroundColor: "#121212",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  label: { color: "#ccc", marginBottom: 6 },

  input: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    color: "#fff",
  },

  textarea: {
    minHeight: 100,
  },

  primary: {
    backgroundColor: "#4da3ff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryText: {
    color: "#000",
    fontWeight: "900",
  },

  disabled: { opacity: 0.5 },

  skip: {
    textAlign: "center",
    color: "#888",
    marginTop: 10,
  },
});

export default CoachSetupScreen;
