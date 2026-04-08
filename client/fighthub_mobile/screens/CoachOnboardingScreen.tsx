import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

type FormState = {
  display_name: string;
  bio: string;
  years_experience: string;
  specialties: string;
  instagram: string;
  website: string;
};

export default function CoachOnboardingScreen() {
  const navigation = useNavigation<any>();

  const [form, setForm] = useState<FormState>({
    display_name: "",
    bio: "",
    years_experience: "",
    specialties: "",
    instagram: "",
    website: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    return (
      form.display_name.trim().length >= 2 &&
      form.bio.trim().length >= 10 &&
      form.years_experience.trim().length > 0
    );
  }, [form]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert(
        "Incomplete profile",
        "Add your display name, bio, and years of experience.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        years_experience: Number(form.years_experience),
        specialties: form.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        instagram: form.instagram.trim() || null,
        website: form.website.trim() || null,
      };

      console.log("coach onboarding payload:", payload);

      // TODO:
      // await apiPost(`${API_URL}/coach/onboarding`, payload, { token: userToken });

      navigation.navigate("CoachSetupScreen", {
        coachProfile: payload,
      });
    } catch (error) {
      console.error("Coach onboarding error:", error);
      Alert.alert("Error", "Failed to save coach profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipGym = async () => {
    if (!isValid) {
      Alert.alert(
        "Finish the basics first",
        "Complete your coach profile before skipping ahead.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        years_experience: Number(form.years_experience),
        specialties: form.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        instagram: form.instagram.trim() || null,
        website: form.website.trim() || null,
      };

      console.log("coach onboarding payload:", payload);

      // TODO:
      // await apiPost(`${API_URL}/coach/onboarding`, payload, { token: userToken });

      navigation.reset({
        index: 0,
        routes: [{ name: "CoachHome" }],
      });
    } catch (error) {
      console.error("Coach onboarding error:", error);
      Alert.alert("Error", "Failed to save coach profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>COACH ONBOARDING</Text>
          <Text style={styles.title}>Build your coaching profile.</Text>
          <Text style={styles.subtitle}>
            Represent your experience, your style, and the fighters you stand
            behind.
          </Text>
        </View>

        <View style={styles.card}>
          <Label text="Display name *" />
          <StyledInput
            value={form.display_name}
            onChangeText={(v) => updateField("display_name", v)}
            placeholder="Coach Mike / Mike Johnson"
          />

          <Label text="Bio *" />
          <StyledMultilineInput
            value={form.bio}
            onChangeText={(v) => updateField("bio", v)}
            placeholder="Tell fighters and scouts who you are, what you coach, and what your gym stands for."
          />

          <Label text="Years of experience *" />
          <StyledInput
            value={form.years_experience}
            onChangeText={(v) => updateField("years_experience", v)}
            placeholder="6"
            keyboardType="number-pad"
          />

          <Label text="Specialties" />
          <StyledInput
            value={form.specialties}
            onChangeText={(v) => updateField("specialties", v)}
            placeholder="Wrestling, Striking, BJJ, MMA Strategy"
          />
          <Text style={styles.helper}>Separate specialties with commas.</Text>

          <Label text="Instagram" />
          <StyledInput
            value={form.instagram}
            onChangeText={(v) => updateField("instagram", v)}
            placeholder="@yourgym or @coachname"
            autoCapitalize="none"
          />

          <Label text="Website" />
          <StyledInput
            value={form.website}
            onChangeText={(v) => updateField("website", v)}
            placeholder="https://yourgym.com"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Next step</Text>
          <Text style={styles.infoText}>
            After this, set up your gym so fighters can request to join your
            roster.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.primaryBtn, !isValid && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.primaryBtnText}>Continue to Gym Setup</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.secondaryBtn}
          onPress={handleSkipGym}
          disabled={submitting}
        >
          <Text style={styles.secondaryBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.28)"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? "sentences"}
      style={styles.input}
    />
  );
}

function StyledMultilineInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.28)"
      multiline
      textAlignVertical="top"
      style={styles.textarea}
    />
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
    paddingBottom: 36,
  },

  header: {
    marginBottom: 18,
  },

  kicker: {
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

  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 10,
    maxWidth: 320,
  },

  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 335,
  },

  card: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  label: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },

  textarea: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    minHeight: 120,
  },

  helper: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 8,
  },

  infoBox: {
    backgroundColor: "rgba(77,163,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(77,163,255,0.22)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
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

  primaryBtn: {
    backgroundColor: "#4da3ff",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    minHeight: 54,
  },

  primaryBtnText: {
    color: "#0b0b0b",
    fontSize: 15,
    fontWeight: "900",
  },

  disabledBtn: {
    opacity: 0.55,
  },

  secondaryBtn: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },

  secondaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
