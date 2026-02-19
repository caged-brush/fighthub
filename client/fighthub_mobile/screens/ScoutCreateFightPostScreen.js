import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import { apiFetch } from "../lib/apiFetch";

/**
 * Creates:
 * 1) Event
 * 2) Fight Slot under that Event
 *
 * This is the minimum viable "scout creates fight post" flow.
 */
export default function ScoutCreateFightPostScreen({ navigation }) {
  const { userToken, role } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);

  // ------- Event fields -------
  const [promotionName, setPromotionName] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [discipline, setDiscipline] = useState("mma"); // match your enum: fight_discipline
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);

  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");

  // ------- Slot fields -------
  const [weightClass, setWeightClass] = useState(""); // text in your schema
  const [targetWeightLbs, setTargetWeightLbs] = useState("");
  const [weightToleranceLbs, setWeightToleranceLbs] = useState("0");
  const [minExperience, setMinExperience] = useState("0");
  const [stylePreferences, setStylePreferences] = useState("");
  const [allowApplications, setAllowApplications] = useState(true);

  const [applicationDeadline, setApplicationDeadline] = useState(new Date());
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [travelSupport, setTravelSupport] = useState(false);
  const [purseCents, setPurseCents] = useState(""); // store cents as integer
  const [posterImageUrl, setPosterImageUrl] = useState("");

  const token = userToken;
  const headers = useMemo(() => {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const parseIntOrNull = (v) => {
    const n = parseInt(String(v || "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  };

  const validate = () => {
    if (!token) return "Missing auth token.";
    if (role !== "scout") return "Only scouts can create fight opportunities.";

    if (!eventTitle.trim()) return "Event title is required.";
    if (!promotionName.trim()) return "Promotion name is required.";
    if (!region.trim()) return "Region is required.";
    if (!city.trim()) return "City is required.";
    if (!venue.trim()) return "Venue is required.";

    if (!weightClass.trim()) return "Weight class is required.";
    const tw = parseIntOrNull(targetWeightLbs);
    if (tw === null || tw <= 0)
      return "Target weight (lbs) must be a positive number.";

    const tol = parseIntOrNull(weightToleranceLbs);
    if (tol === null || tol < 0) return "Weight tolerance must be 0 or higher.";

    const minExp = parseIntOrNull(minExperience);
    if (minExp === null || minExp < 0)
      return "Min experience must be 0 or higher.";

    if (applicationDeadline > eventDate)
      return "Application deadline must be before the event date.";

    const purse = purseCents ? parseIntOrNull(purseCents) : null;
    if (purse !== null && purse < 0) return "Purse cents must be 0 or higher.";

    return null;
  };

  const createOpportunity = async () => {
    const err = validate();
    if (err) return Alert.alert("Fix this", err);

    setLoading(true);

    try {
      // 1) Create Event
      // Adjust the endpoint + payload to match your backend
      const eventPayload = {
        promotion_name: promotionName.trim(),
        title: eventTitle.trim(),
        discipline, // "mma" | "boxing" | etc
        region: region.trim(),
        city: city.trim(),
        venue: venue.trim(),
        event_date: eventDate.toISOString().slice(0, 10), // date only (matches schema)
        description: description.trim() || null,
        rules: rules.trim() || null,
        poster_image_url: posterImageUrl.trim() || null,
      };

      //   const eventRes = await apiFetch("/events", {
      //     method: "POST",
      //     token,
      //     body: eventPayload,
      //   });

      //   const eventId = eventRes?.event?.id || eventRes?.id;
      //   if (!eventId) throw new Error("Backend did not return event id.");

      // 2) Create Slot under Event
      const slotPayload = {
        event_id: eventId,
        discipline, // match your slot discipline type
        weight_class: weightClass.trim(),
        target_weight_lbs: parseInt(targetWeightLbs, 10),
        weight_tolerance_lbs: parseInt(weightToleranceLbs, 10),
        min_experience: parseInt(minExperience, 10),
        style_preferences: stylePreferences.trim() || null,
        allow_applications: !!allowApplications,
        application_deadline: applicationDeadline.toISOString(),
        travel_support: !!travelSupport,
        purse_cents: purseCents ? parseInt(purseCents, 10) : null,
      };

      const res = await apiFetch("/fights/opportunities", {
        method: "POST",
        token, // MUST be your userToken
        body: {
          event: eventPayload,
          slot: slotPayload,
        },
      });

      const eventId = res?.event?.id;
      const slotId = res?.slot?.id;

      if (!eventId || !slotId) {
        throw new Error("Backend did not return event/slot id.");
      }

      Alert.alert("Posted", "Fight opportunity created successfully.");
      // Navigate to detail screen if you have it
      if (slotId) {
        navigation.navigate("FightOpportunityDetails", { slotId });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create fight opportunity.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const onPickEventDate = (evt, selected) => {
    setShowEventDatePicker(false);
    if (selected) setEventDate(selected);
  };

  const onPickDeadline = (evt, selected) => {
    setShowDeadlinePicker(false);
    if (selected) setApplicationDeadline(selected);
  };

  const Toggle = ({ label, value, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#333",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
      }}
    >
      <Text style={{ color: "white", fontSize: 15 }}>{label}</Text>
      <Text style={{ color: "white", fontWeight: "700" }}>
        {value ? "ON" : "OFF"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "black" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
        Create Fight Opportunity
      </Text>

      <Text style={{ color: "#aaa", marginTop: 6 }}>
        This creates an event + a slot. That’s the marketplace loop.
      </Text>

      {/* EVENT */}
      <Text
        style={{
          color: "white",
          marginTop: 18,
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        Event
      </Text>

      <Label text="Promotion Name" />
      <Input
        value={promotionName}
        onChangeText={setPromotionName}
        placeholder="e.g., ABC Promotions"
      />

      <Label text="Event Title" />
      <Input
        value={eventTitle}
        onChangeText={setEventTitle}
        placeholder="e.g., Fight Night 12"
      />

      <Label text="Discipline (match your enum)" />
      <Input
        value={discipline}
        onChangeText={setDiscipline}
        placeholder="mma / boxing / kickboxing"
      />

      <Label text="Region" />
      <Input
        value={region}
        onChangeText={setRegion}
        placeholder="e.g., British Columbia"
      />

      <Label text="City" />
      <Input
        value={city}
        onChangeText={setCity}
        placeholder="e.g., Vancouver"
      />

      <Label text="Venue" />
      <Input
        value={venue}
        onChangeText={setVenue}
        placeholder="e.g., Rogers Arena"
      />

      <TouchableOpacity
        onPress={() => setShowEventDatePicker(true)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#333",
          marginTop: 10,
        }}
      >
        <Text style={{ color: "#aaa" }}>Event Date</Text>
        <Text style={{ color: "white", fontWeight: "700", marginTop: 6 }}>
          {eventDate.toDateString()}
        </Text>
      </TouchableOpacity>

      {showEventDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickEventDate}
        />
      )}

      <Label text="Description (optional)" />
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder="Event details…"
        multiline
      />

      <Label text="Rules (optional)" />
      <Input
        value={rules}
        onChangeText={setRules}
        placeholder="3x5, elbows allowed, etc"
        multiline
      />

      <Label text="Poster Image URL (optional)" />
      <Input
        value={posterImageUrl}
        onChangeText={setPosterImageUrl}
        placeholder="https://…"
      />

      {/* SLOT */}
      <Text
        style={{
          color: "white",
          marginTop: 22,
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        Slot Requirements
      </Text>

      <Label text="Weight Class" />
      <Input
        value={weightClass}
        onChangeText={setWeightClass}
        placeholder="e.g., Welterweight"
      />

      <Label text="Target Weight (lbs)" />
      <Input
        value={targetWeightLbs}
        onChangeText={setTargetWeightLbs}
        placeholder="e.g., 170"
        keyboardType="number-pad"
      />

      <Label text="Weight Tolerance (lbs)" />
      <Input
        value={weightToleranceLbs}
        onChangeText={setWeightToleranceLbs}
        placeholder="e.g., 3"
        keyboardType="number-pad"
      />

      <Label text="Min Experience (0+)" />
      <Input
        value={minExperience}
        onChangeText={setMinExperience}
        placeholder="e.g., 2"
        keyboardType="number-pad"
      />

      <Label text="Style Preferences (optional)" />
      <Input
        value={stylePreferences}
        onChangeText={setStylePreferences}
        placeholder="e.g., striker, southpaw"
      />

      <TouchableOpacity
        onPress={() => setShowDeadlinePicker(true)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#333",
          marginTop: 10,
        }}
      >
        <Text style={{ color: "#aaa" }}>Application Deadline</Text>
        <Text style={{ color: "white", fontWeight: "700", marginTop: 6 }}>
          {applicationDeadline.toLocaleString()}
        </Text>
      </TouchableOpacity>

      {showDeadlinePicker && (
        <DateTimePicker
          value={applicationDeadline}
          mode="datetime"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickDeadline}
        />
      )}

      <Toggle
        label="Allow Applications"
        value={allowApplications}
        onPress={() => setAllowApplications((v) => !v)}
      />

      <Toggle
        label="Travel Support"
        value={travelSupport}
        onPress={() => setTravelSupport((v) => !v)}
      />

      <Label text="Purse (cents, optional)" />
      <Input
        value={purseCents}
        onChangeText={setPurseCents}
        placeholder="e.g., 50000"
        keyboardType="number-pad"
      />

      <TouchableOpacity
        onPress={createOpportunity}
        disabled={loading}
        style={{
          marginTop: 18,
          backgroundColor: "white",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontWeight: "800" }}>Publish Opportunity</Text>
        )}
      </TouchableOpacity>

      <Text style={{ color: "#666", marginTop: 12, fontSize: 12 }}>
        If this fails, it’s your backend contract, not the UI.
      </Text>
    </ScrollView>
  );
}

function Label({ text }) {
  return <Text style={{ color: "#aaa", marginTop: 10 }}>{text}</Text>;
}

function Input({ value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#555"
      multiline={!!multiline}
      keyboardType={keyboardType}
      style={{
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "white",
        minHeight: multiline ? 90 : undefined,
      }}
    />
  );
}
