import React, { useContext, useEffect, useMemo, useState } from "react";
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
  gymId?: string;
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

type AuthContextShape = {
  userToken: string | null;
  completeOnboarding?: () => Promise<void>;
};

type GymResponse = {
  gym: {
    id: string;
    name: string;
    bio: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    website: string | null;
    instagram: string | null;
    logo_path: string | null;
  };
};

type SaveGymResponse = {
  ok: true;
  gym: {
    id: string;
    name: string;
    bio: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    website: string | null;
    instagram: string | null;
    logo_path: string | null;
  };
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

const CoachSetupScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userToken, completeOnboarding } = useContext(
    AuthContext,
  ) as AuthContextShape;

  const params = (route.params || {}) as RouteParams;
  const coachProfile = params.coachProfile || null;
  const gymId = params.gymId || null;
  const isEditMode = !!gymId;

  const [loadingGym, setLoadingGym] = useState<boolean>(!!gymId);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"create" | "later">(
    gymId ? "create" : "create",
  );

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
    if (!isEditMode && mode === "later") return true;

    return (
      form.name.trim().length >= 2 &&
      form.city.trim().length >= 2 &&
      form.region.trim().length >= 2
    );
  }, [form, mode, isEditMode]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadGym = async () => {
      if (!gymId || !userToken) return;

      try {
        setLoadingGym(true);

        const res = await fetch(`${API_URL}/coach/gyms/${gymId}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        const data = await parseJsonResponse<GymResponse>(res);
        const gym = data.gym;

        setForm({
          name: gym.name || "",
          city: gym.city || "",
          region: gym.region || "",
          country: gym.country || "Canada",
          description: gym.bio || "",
          instagram: gym.instagram || "",
          website: gym.website || "",
        });
      } catch (e: any) {
        console.log("Load gym error:", e?.message || e);
        Alert.alert("Error", e?.message || "Failed to load gym.");
      } finally {
        setLoadingGym(false);
      }
    };

    loadGym();
  }, [gymId, userToken]);

  const markCoachOnboardingComplete = async () => {
    if (!userToken) {
      throw new Error("No auth token");
    }

    const res = await fetch(`${API_URL}/coach/onboarding/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    });

    await parseJsonResponse<{ ok: true }>(res);
  };

  const finishOnboardingFlow = async () => {
    await markCoachOnboardingComplete();

    if (completeOnboarding) {
      await completeOnboarding();
    }

    navigation.reset({
      index: 0,
      routes: [{ name: "CoachDashboard" }],
    });
  };

  const handleDeleteGym = async () => {
    if (!gymId) return;

    if (!userToken) {
      Alert.alert("Auth error", "You are not logged in.");
      return;
    }

    Alert.alert(
      "Delete gym?",
      "This will permanently delete the gym and remove its memberships. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);

              const res = await fetch(`${API_URL}/coach/gyms/${gymId}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${userToken}`,
                },
              });

              const text = await res.text();

              let data: any = {};
              try {
                data = JSON.parse(text);
              } catch {
                throw new Error(
                  `Server returned non-JSON response (${res.status})`,
                );
              }

              if (!res.ok) {
                throw new Error(data?.message || "Failed to delete gym.");
              }

              Alert.alert("Deleted", "Gym deleted successfully.");

              navigation.reset({
                index: 0,
                routes: [{ name: "CoachDashboard" }],
              });
            } catch (e: any) {
              console.log("Delete gym error:", e?.message || e);
              Alert.alert("Error", e?.message || "Failed to delete gym.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
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
      if (!isEditMode && mode === "later") {
        await finishOnboardingFlow();
        return;
      }

      const payload = {
        name: form.name.trim(),
        bio: form.description.trim() || null,
        city: form.city.trim() || null,
        region: form.region.trim() || null,
        country: form.country.trim() || "Canada",
        website: form.website.trim() || null,
        instagram: form.instagram.trim() || null,
      };

      const url = isEditMode
        ? `${API_URL}/coach/gyms/${gymId}`
        : `${API_URL}/coach/gyms`;

      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonResponse<SaveGymResponse>(res);
      console.log(isEditMode ? "Gym updated:" : "Gym created:", data);

      if (isEditMode) {
        Alert.alert("Success", "Gym information updated.");
        navigation.goBack();
        return;
      }

      await finishOnboardingFlow();
    } catch (e: any) {
      console.log("Coach setup error:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to save gym.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (isEditMode) {
      navigation.goBack();
      return;
    }

    Alert.alert("Skip gym setup?", "You can create your gym later.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: async () => {
          try {
            await finishOnboardingFlow();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to continue.");
          }
        },
      },
    ]);
  };

  if (loadingGym) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading gym info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>
              {isEditMode ? "Manage your gym" : "Set up your gym"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode
                ? "Update your gym information properly."
                : "Give your fighters a real base."}
            </Text>

            {!isEditMode && coachProfile && (
              <View style={styles.coachCard}>
                <Text style={styles.coachName}>
                  {coachProfile.display_name || "Coach"}
                </Text>
                <Text style={styles.coachMeta}>
                  {coachProfile.years_experience || 0} years experience
                </Text>
              </View>
            )}

            {!isEditMode && (
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
            )}

            {(isEditMode || mode === "create") && (
              <View style={styles.card}>
                <Input
                  label="Gym name"
                  value={form.name}
                  onChange={(value) => handleChange("name", value)}
                />
                <Input
                  label="City"
                  value={form.city}
                  onChange={(value) => handleChange("city", value)}
                />
                <Input
                  label="Region"
                  value={form.region}
                  onChange={(value) => handleChange("region", value)}
                />
                <Input
                  label="Country"
                  value={form.country}
                  onChange={(value) => handleChange("country", value)}
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(value) => handleChange("description", value)}
                  multiline
                />
                <Input
                  label="Instagram"
                  value={form.instagram}
                  onChange={(value) => handleChange("instagram", value)}
                  autoCapitalize="none"
                />
                <Input
                  label="Website"
                  value={form.website}
                  onChange={(value) => handleChange("website", value)}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            )}

            {!isEditMode && mode === "later" && (
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Skipping for now</Text>
                <Text style={styles.infoText}>
                  You can finish onboarding now and create your gym later.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primary, !isValid && styles.disabled]}
              onPress={handleContinue}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#0b0b0b" />
              ) : (
                <Text style={styles.primaryText}>
                  {isEditMode
                    ? "Save changes"
                    : mode === "create"
                      ? "Create gym and continue"
                      : "Continue"}
                </Text>
              )}
            </TouchableOpacity>
            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteGym}
                disabled={submitting}
              >
                <Text style={styles.deleteBtnText}>Delete Gym</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skip}>{isEditMode ? "Cancel" : "Skip"}</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#aaa", marginTop: 12 },
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

  deleteBtn: {
    marginTop: 12,
    backgroundColor: "#2a1111",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.25)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  deleteBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },

  toggleText: { color: "#aaa" },
  toggleTextActive: { color: "#4da3ff" },

  card: {
    backgroundColor: "#121212",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  infoBox: {
    backgroundColor: "rgba(77,163,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(77,163,255,0.22)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  infoTitle: {
    color: "#4da3ff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },

  infoText: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 13,
    lineHeight: 19,
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
