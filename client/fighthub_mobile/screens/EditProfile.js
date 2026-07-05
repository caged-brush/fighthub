import React, { useContext, useEffect, useState } from "react";
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
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

const WEIGHT_CLASSES = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
];

const FIGHT_STYLES = ["Striker", "Grappler", "Wrestler", "Boxer", "Mixed"];

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const EditProfile = () => {
  const navigation = useNavigation();
  const { userId, userToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fname: "",
    lname: "",
    region: "",
    gym: "",
    bio: "",
    weight_class: "",
    fight_style: "",
    weight: "",
    height: "",
    is_available: true,
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/fighters/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const f = await safeJson(res);

        setForm({
          fname: f?.users?.fname || "",
          lname: f?.users?.lname || "",
          region: f?.users?.region || f?.region || "",
          gym: f?.gym || "",
          bio: f?.bio || "",
          weight_class: f?.weight_class || "",
          fight_style: f?.fight_style || "",
          weight: f?.weight != null ? String(f.weight) : "",
          height: f?.height != null ? String(f.height) : "",
          is_available: !!f?.is_available,
        });
      } catch (e) {
        Alert.alert("Error", "Couldn't load your profile. Try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, userToken]);

  const validate = () => {
    if (!form.fname.trim() || !form.lname.trim()) {
      Alert.alert("Missing name", "Enter your first and last name.");
      return false;
    }
    if (form.weight && isNaN(Number(form.weight))) {
      Alert.alert("Invalid weight", "Weight must be a number.");
      return false;
    }
    if (form.height && isNaN(Number(form.height))) {
      Alert.alert("Invalid height", "Height must be a number.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/fighters/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fname: form.fname.trim(),
          lname: form.lname.trim(),
          region: form.region.trim(),
          gym: form.gym.trim(),
          bio: form.bio.trim(),
          weight_class: form.weight_class,
          fight_style: form.fight_style,
          weight: form.weight ? Number(form.weight) : null,
          height: form.height ? Number(form.height) : null,
          is_available: form.is_available,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Update failed");
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't save", e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Edit profile" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#E8B84B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Edit profile" onBack={() => navigation.goBack()} />

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
            <SectionLabel text="Basics" />
            <View style={styles.card}>
              <Row2>
                <Field
                  style={{ flex: 1 }}
                  label="First name"
                  value={form.fname}
                  onChangeText={(v) => set("fname", v)}
                  autoCapitalize="words"
                />
                <Field
                  style={{ flex: 1 }}
                  label="Last name"
                  value={form.lname}
                  onChangeText={(v) => set("lname", v)}
                  autoCapitalize="words"
                />
              </Row2>

              <Field
                label="Region"
                value={form.region}
                onChangeText={(v) => set("region", v)}
                placeholder="e.g. Kamloops, BC"
              />

              <Field
                label="Gym"
                value={form.gym}
                onChangeText={(v) => set("gym", v)}
                placeholder="Your current gym"
                last
              />
            </View>

            <SectionLabel text="Fight profile" />
            <View style={styles.card}>
              <Text style={styles.label}>Weight class</Text>
              <ChipRow
                options={WEIGHT_CLASSES}
                value={form.weight_class}
                onChange={(v) => set("weight_class", v)}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Fight style</Text>
              <ChipRow
                options={FIGHT_STYLES}
                value={form.fight_style}
                onChange={(v) => set("fight_style", v)}
              />

              <Row2 style={{ marginTop: 16 }}>
                <Field
                  style={{ flex: 1 }}
                  label="Weight (lbs)"
                  value={form.weight}
                  onChangeText={(v) => set("weight", v)}
                  keyboardType="numeric"
                />
                <Field
                  style={{ flex: 1 }}
                  label="Height (cm)"
                  value={form.height}
                  onChangeText={(v) => set("height", v)}
                  keyboardType="numeric"
                />
              </Row2>
            </View>

            <SectionLabel text="Bio" />
            <View style={styles.card}>
              <TextInput
                style={styles.textarea}
                value={form.bio}
                onChangeText={(v) => set("bio", v)}
                placeholder="Tell scouts and coaches about your background, training, and goals..."
                placeholderTextColor="rgba(245,241,232,0.32)"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{form.bio.length}/500</Text>
            </View>

            <SectionLabel text="Availability" />
            <View style={styles.card}>
              <View style={styles.availRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availTitle}>Available for matches</Text>
                  <Text style={styles.availSub}>
                    Scouts and coaches can see you're open to booking.
                  </Text>
                </View>
                <Switch
                  value={form.is_available}
                  onValueChange={(v) => set("is_available", v)}
                  trackColor={{
                    false: "rgba(245,241,232,0.15)",
                    true: "#E8B84B",
                  }}
                  thumbColor="#F5F1E8"
                  ios_backgroundColor="rgba(245,241,232,0.15)"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#0B0B0C" />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
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

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Row2({ children, style }) {
  return <View style={[styles.row2, style]}>{children}</View>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  style,
  last,
}) {
  return (
    <View style={[styles.field, style, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,241,232,0.32)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#F5F1E8", fontSize: 16, fontWeight: "800" },

  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

  sectionLabel: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 6,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    padding: 16,
    marginBottom: 20,
  },

  row2: { flexDirection: "row", gap: 12 },

  field: { marginBottom: 14 },
  label: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#0F0F0F",
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#F5F1E8",
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.10)",
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.12)",
    backgroundColor: "#0F0F0F",
  },
  chipActive: {
    borderColor: "#E8B84B",
    backgroundColor: "rgba(232,184,75,0.12)",
  },
  chipText: {
    color: "rgba(245,241,232,0.6)",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: { color: "#E8B84B" },

  textarea: {
    backgroundColor: "#0F0F0F",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.10)",
    padding: 14,
    color: "#F5F1E8",
    fontSize: 15,
    minHeight: 120,
  },
  charCount: {
    color: "rgba(245,241,232,0.3)",
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },

  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  availTitle: {
    color: "#F5F1E8",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  availSub: {
    color: "rgba(245,241,232,0.5)",
    fontSize: 13,
    lineHeight: 18,
  },

  saveBtn: {
    backgroundColor: "#E8B84B",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#0B0B0C", fontWeight: "800", fontSize: 16 },
});

export default EditProfile;
