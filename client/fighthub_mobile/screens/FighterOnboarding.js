import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import { API_URL } from "../Constants";
import { Picker } from "@react-native-picker/picker";

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

const FIGHT_STYLES = [
  "Wrestling",
  "Boxing",
  "BJJ",
  "MMA",
  "Muay Thai",
  "Kickboxing",
  "Judo",
];

const CANADA_REGIONS = [
  { code: "BC", label: "British Columbia" },
  { code: "AB", label: "Alberta" },
  { code: "SK", label: "Saskatchewan" },
  { code: "MB", label: "Manitoba" },
  { code: "ON", label: "Ontario" },
  { code: "QC", label: "Quebec" },
  { code: "NB", label: "New Brunswick" },
  { code: "NS", label: "Nova Scotia" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "NL", label: "Newfoundland and Labrador" },
  { code: "YT", label: "Yukon" },
  { code: "NT", label: "Northwest Territories" },
  { code: "NU", label: "Nunavut" },
];

const toYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toInt = (v) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const toFloat = (v) => {
  const cleaned = String(v ?? "").replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export default function FighterOnboarding() {
  const { userToken, completeOnboarding, logout } = useContext(AuthContext);

  const [submitting, setSubmitting] = useState(false);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));
  const [tempDob, setTempDob] = useState(dobDate);

  const [weightClass, setWeightClass] = useState("");
  const [region, setRegion] = useState("");

  const [wins, setWins] = useState("0");
  const [losses, setLosses] = useState("0");
  const [draws, setDraws] = useState("0");
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  const [heightCm, setHeightCm] = useState("");
  const [weightLbs, setWeightLbs] = useState("");

  const [fightStyle, setFightStyle] = useState("");

  // ✅ NEW FIELDS
  const [gym, setGym] = useState("");
  const [bio, setBio] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const canSubmit = useMemo(() => {
    if (!dateOfBirth || dateOfBirth.length !== 10) return false;
    if (!weightClass) return false;
    if (!fightStyle) return false;
    const allowed = new Set([
      "BC",
      "AB",
      "SK",
      "MB",
      "ON",
      "QC",
      "NB",
      "NS",
      "PE",
      "NL",
      "YT",
      "NT",
      "NU",
    ]);
    if (!allowed.has(region)) return false;

    // ✅ required
    if (gym.trim().length < 2) return false;
    if (bio.trim().length < 10) return false; // force something meaningful

    if (submitting) return false;
    return true;
  }, [dateOfBirth, weightClass, fightStyle, region, gym, bio, submitting]);

  const onDobChange = (event, selectedDate) => {
    // Android fires "set" or "dismissed"
    if (Platform.OS === "android") {
      setShowDatePicker(false);

      if (event?.type === "set" && selectedDate) {
        setDobDate(selectedDate);
        setTempDob(selectedDate);
        setDateOfBirth(toYMD(selectedDate));
      }
      return;
    }

    // iOS inline mode: just update temp, user hits Done
    if (selectedDate) setTempDob(selectedDate);
  };

  const handleFinish = async () => {
    if (!userToken) {
      Alert.alert("Session error", "Please log in again.");
      return;
    }
    if (!canSubmit) {
      Alert.alert(
        "Missing info",
        "DOB, Weight Class, Region, Fight Style, Gym, and Bio are required.\nBio must be at least 10 characters.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date_of_birth: dateOfBirth,
        weight_class: weightClass,
        region: region.trim(),

        wins: toInt(wins),
        losses: toInt(losses),
        draws: toInt(draws),

        height: heightCm ? toFloat(heightCm) : null,
        weight: weightLbs ? toFloat(weightLbs) : null,

        fight_style: fightStyle,

        // ✅ NEW
        gym: gym.trim(),
        bio: bio.trim(),
        is_available: !!isAvailable,
      };

      const res = await axios.put(`${API_URL}/fighters/me`, payload, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      console.log("FIGHTER ONBOARDING RESPONSE:", res.data);
      await completeOnboarding();
    } catch (err) {
      console.error(
        "FIGHTER ONBOARDING ERROR:",
        err?.response?.data || err?.message,
      );
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save fighter profile",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Fighter Profile</Text>
        <Text style={styles.subtitle}>
          Set the basics so scouts can find and book you.
        </Text>

        <Text style={styles.label}>Date of birth *</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => {
            setTempDob(dobDate);
            setShowDatePicker(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.dateText}>
            {dateOfBirth ? dateOfBirth : "Select date (YYYY-MM-DD)"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={{ marginTop: 10 }}>
            <DateTimePicker
              value={Platform.OS === "ios" ? tempDob : dobDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={onDobChange}
            />

            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setDobDate(tempDob);
                  setDateOfBirth(toYMD(tempDob));
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>Weight class *</Text>
        <View style={styles.pillsRow}>
          {WEIGHT_CLASSES.map((wc) => {
            const active = wc === weightClass;
            return (
              <TouchableOpacity
                key={wc}
                onPress={() => setWeightClass(wc)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {wc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Province/Territory *</Text>

        <TouchableOpacity
          style={styles.input}
          activeOpacity={0.85}
          onPress={() => setShowRegionPicker(true)}
        >
          <Text style={{ color: region ? "#fff" : "#777", fontSize: 16 }}>
            {region
              ? CANADA_REGIONS.find((r) => r.code === region)?.label
              : "Select province/territory..."}
          </Text>
        </TouchableOpacity>

        {/* ✅ NEW: Gym */}
        <Text style={styles.label}>Gym *</Text>
        <TextInput
          style={styles.input}
          value={gym}
          onChangeText={setGym}
          placeholder="e.g. Tristar Gym"
          placeholderTextColor="#777"
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* ✅ NEW: Availability */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.labelNoMargin}>Available to book *</Text>
            <Text style={styles.smallHint}>
              Scouts will filter for available fighters.
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: "#333", true: "#ffd700" }}
            thumbColor={isAvailable ? "#e0245e" : "#888"}
          />
        </View>

        {/* ✅ NEW: Bio */}
        <Text style={styles.label}>Bio *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Short bio: style, experience, achievements, who you want to fight..."
          placeholderTextColor="#777"
          multiline
          textAlignVertical="top"
          maxLength={240}
        />
        <Text style={styles.charCount}>{bio.trim().length}/240</Text>

        <Text style={styles.label}>Record</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Wins</Text>
            <TextInput
              style={styles.input}
              value={wins}
              onChangeText={setWins}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#777"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Losses</Text>
            <TextInput
              style={styles.input}
              value={losses}
              onChangeText={setLosses}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#777"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Draws</Text>
            <TextInput
              style={styles.input}
              value={draws}
              onChangeText={setDraws}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#777"
            />
          </View>
        </View>

        <Text style={styles.label}>Physical (optional)</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              placeholder="e.g. 188"
              placeholderTextColor="#777"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={weightLbs}
              onChangeText={setWeightLbs}
              keyboardType="decimal-pad"
              placeholder="e.g. 170"
              placeholderTextColor="#777"
            />
          </View>
        </View>

        <Text style={styles.label}>Fight style *</Text>
        <View style={styles.pillsRow}>
          {FIGHT_STYLES.map((fs) => {
            const active = fs === fightStyle;
            return (
              <TouchableOpacity
                key={fs}
                onPress={() => setFightStyle(fs)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {fs}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <CustomButton
          style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
          onPress={handleFinish}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.primaryText}>Finish</Text>
          )}
        </CustomButton>

        <CustomButton style={styles.secondaryBtn} onPress={logout}>
          <Text style={styles.secondaryText}>Logout</Text>
        </CustomButton>

        <Text style={styles.hint}>* Required fields</Text>

        <Modal
          visible={showRegionPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowRegionPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowRegionPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>

              <Picker
                selectedValue={region}
                onValueChange={(v) => setRegion(v)}
              >
                <Picker.Item label="Select province/territory..." value="" />
                {CANADA_REGIONS.map((r) => (
                  <Picker.Item key={r.code} label={r.label} value={r.code} />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#181818" },
  container: { padding: 20, paddingBottom: 30 },
  title: { color: "#ffd700", fontSize: 26, fontWeight: "900", marginBottom: 4 },
  subtitle: { color: "#bbb", marginBottom: 16 },

  label: {
    color: "#ffd700",
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  labelNoMargin: { color: "#ffd700", fontWeight: "900" },
  smallLabel: { color: "#bbb", fontWeight: "700", marginBottom: 6 },
  smallHint: { color: "#888", marginTop: 4 },

  dateField: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0245e",
  },
  dateText: { color: "#fff", fontSize: 16 },

  doneBtn: {
    marginTop: 12,
    backgroundColor: "#e0245e",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#e0245e",
  },

  textArea: {
    height: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },
  charCount: { color: "#777", marginTop: 6, textAlign: "right" },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillActive: { borderColor: "#e0245e" },
  pillText: { color: "#ccc", fontWeight: "800" },
  pillTextActive: { color: "#fff" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#232323",
  },

  pickerWrap: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0245e",
    overflow: "hidden",
    height: 56, // 👈 give it room
    justifyContent: "center",
  },
  picker: {
    color: "#fff",
    height: 56, // 👈 match
  },

  primaryBtn: { marginTop: 18, backgroundColor: "#e0245e" },
  btnDisabled: { opacity: 0.5 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  secondaryBtn: { marginTop: 10, backgroundColor: "#292929" },
  secondaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  hint: { marginTop: 12, color: "#777", textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: "#1c1c1c",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    alignItems: "flex-end",
  },
  modalDone: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 16,
  },
});
