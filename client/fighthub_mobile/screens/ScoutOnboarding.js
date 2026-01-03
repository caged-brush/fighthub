import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import DateTimePicker from "@react-native-community/datetimepicker";

const toYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ScoutOnboarding() {
  const { completeOnboarding, userToken } = useContext(AuthContext);

  const [form, setForm] = useState({
    date_of_birth: "",
    organization: "",
    region: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));

  const canSubmit = useMemo(() => {
    return (
      form.date_of_birth.trim().length === 10 &&
      form.organization.trim().length > 1 &&
      form.region.trim().length > 1 &&
      !submitting
    );
  }, [form, submitting]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onDobChange = (_, selectedDate) => {
    // iOS keeps picker open; Android closes automatically
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (!selectedDate) return;

    setDobDate(selectedDate);
    handleChange("date_of_birth", toYMD(selectedDate));
  };

  const handleFinish = async () => {
    if (!userToken) {
      Alert.alert(
        "Session error",
        "You are not logged in. Please log in again."
      );
      return;
    }

    const dob = form.date_of_birth.trim();
    const org = form.organization.trim();
    const region = form.region.trim();

    if (!dob) {
      Alert.alert("Missing info", "Please select your date of birth.");
      return;
    }
    if (!org || !region) {
      Alert.alert("Missing info", "Organization and region are required.");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        date_of_birth: dob,
        organization: org,
        region,
      };

      console.log("SCOUT ONBOARDING SUBMIT:", payload);

      const res = await axios.put(`${API_URL}/scouts/me`, payload, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      console.log("SCOUT ONBOARDING RESPONSE:", res.data);

      await completeOnboarding();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to save scout profile";

      console.error(
        "SCOUT ONBOARDING ERROR:",
        err.response?.data || err.message
      );
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Scout Profile</Text>
          <Text style={styles.subtitle}>
            This helps fighters know who you are and helps us personalize
            discovery.
          </Text>

          <Text style={styles.label}>Date of birth</Text>

          {/* Tap-to-open DOB picker */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.85}
            style={styles.dateField}
          >
            <Text style={styles.dateText}>
              {form.date_of_birth
                ? form.date_of_birth
                : "Select date (YYYY-MM-DD)"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dobDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={onDobChange}
            />
          )}

          {/* iOS needs an explicit done button */}
          {showDatePicker && Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Organization / Promotion</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ABC MMA, Matchmaker, Promotion name"
            placeholderTextColor="#888"
            value={form.organization}
            onChangeText={(v) => handleChange("organization", v)}
          />

          <Text style={styles.label}>Region</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vancouver, BC"
            placeholderTextColor="#888"
            value={form.region}
            onChangeText={(v) => handleChange("region", v)}
          />


          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleFinish}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Finish</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Required: DOB, Organization, Region</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#181818" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  card: {
    backgroundColor: "#232323",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: { color: "#ffd700", fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#ddd", marginBottom: 18, lineHeight: 20 },
  label: { color: "#ffd700", fontWeight: "700", marginBottom: 6 },

  dateField: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0245e",
    marginBottom: 14,
  },
  dateText: { color: "#fff", fontSize: 16 },

  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#e0245e",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#e0245e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hint: { marginTop: 12, color: "#aaa", textAlign: "center", fontSize: 12 },
});
