import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../lib/apiFetch"; // your helper

export default function FightOpportunityDetailsScreen({ route, navigation }) {
  const { slotId } = route.params || {};

  // Your AuthContext uses userToken + role (based on what you pasted)
  const { userToken, role, userId } = useContext(AuthContext);
  const token = userToken;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const canApply = useMemo(() => role === "fighter", [role]);
  const isScout = useMemo(() => role === "scout", [role]);

  function supaErrToString(err) {
    if (!err) return "Unknown Supabase error";
    return (
      err.message || err.details || err.hint || err.code || JSON.stringify(err)
    );
  }

  const load = async () => {
    if (!slotId) {
      Alert.alert("Error", "Missing slotId");
      navigation.goBack();
      return;
    }
    if (!token) {
      Alert.alert("Error", "Missing auth token");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      // EXPECTED BACKEND:
      // GET /fights/slots/:id  -> { slot: {...}, event: {...}, meta: {...} }
      const res = await apiFetch(`/fights/slots/${slotId}`, { token });
      setData(res);
    } catch (e) {
      console.log("STATUS:", e.status);
      console.log("DATA:", e.data);
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const applyToSlot = async () => {
    if (!canApply) return;
    try {
      // EXPECTED BACKEND:
      // POST /fights/slots/:id/apply -> { application: { id, status } }
      const res = await apiFetch(`/fights/slots/${slotId}/apply`, {
        method: "POST",
        token,
        body: {}, // keep empty; backend can infer fighter from auth.uid()/userId
      });

      Alert.alert("Applied", "Your application was submitted.");
      await load();
      return res;
    } catch (e) {
      const msg = e.message || "Failed to apply";
      Alert.alert("Error", msg);
    }
  };

  const viewApplicants = () => {
    // You can build this next:
    // navigation.navigate("ApplicantsList", { slotId });
    Alert.alert("Next step", "Build the Applicants screen next.");
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
        <Text style={{ color: "#aaa", marginTop: 10 }}>Loading…</Text>
      </View>
    );
  }

  const slot = data?.slot;
  const event = data?.event;
  const meta = data?.meta || {};

  if (!slot || !event) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>
          Opportunity not found
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 14,
            backgroundColor: "white",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusPill = (text) => (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#333",
      }}
    >
      <Text style={{ color: "white", fontWeight: "700" }}>{text}</Text>
    </View>
  );

  const Row = ({ label, value }) => (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: "#aaa", fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: "white",
          fontSize: 15,
          fontWeight: "700",
          marginTop: 4,
        }}
      >
        {value ?? "—"}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "black" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 26 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
    >
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
        {event.title || "Fight Opportunity"}
      </Text>

      <Text style={{ color: "#aaa", marginTop: 6 }}>
        {event.promotion_name || "Promotion"} • {event.city || "City"},{" "}
        {event.region || "Region"}
      </Text>

      <View style={{ marginTop: 12 }}>
        {statusPill(String(slot.status || "open").toUpperCase())}
      </View>

      {/* EVENT */}
      <Text
        style={{
          color: "white",
          marginTop: 18,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        Event
      </Text>

      <Card>
        <Row label="Discipline" value={event.discipline} />
        <Row label="Date" value={event.event_date} />
        <Row label="Venue" value={event.venue} />
        <Row label="Rules" value={event.rules} />
        <Row label="Description" value={event.description} />
      </Card>

      {/* SLOT */}
      <Text
        style={{
          color: "white",
          marginTop: 18,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        Slot Requirements
      </Text>

      <Card>
        <Row label="Weight Class" value={slot.weight_class} />
        <Row label="Target Weight (lbs)" value={slot.target_weight_lbs} />
        <Row label="Tolerance (lbs)" value={slot.weight_tolerance_lbs} />
        <Row label="Min Experience" value={slot.min_experience} />
        <Row label="Style Preferences" value={slot.style_preferences} />
        <Row label="Application Deadline" value={slot.application_deadline} />
        <Row
          label="Travel Support"
          value={slot.travel_support ? "Yes" : "No"}
        />
        <Row
          label="Purse"
          value={
            slot.purse_cents != null
              ? `$${(slot.purse_cents / 100).toFixed(2)}`
              : "—"
          }
        />
        <Row
          label="Allow Applications"
          value={slot.allow_applications ? "Yes" : "No"}
        />
      </Card>

      {/* META */}
      {(meta.applicants_count != null || meta.viewer_application_status) && (
        <>
          <Text
            style={{
              color: "white",
              marginTop: 18,
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            Activity
          </Text>
          <Card>
            <Row label="Applicants" value={meta.applicants_count} />
            <Row label="Your Status" value={meta.viewer_application_status} />
          </Card>
        </>
      )}

      {/* ACTIONS */}
      <View style={{ marginTop: 18 }}>
        {canApply && (
          <TouchableOpacity
            onPress={applyToSlot}
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              opacity:
                slot.allow_applications && slot.status === "open" ? 1 : 0.5,
            }}
            disabled={!(slot.allow_applications && slot.status === "open")}
          >
            <Text style={{ fontWeight: "900" }}>Apply for Fight</Text>
          </TouchableOpacity>
        )}

        {isScout && (
          <TouchableOpacity
            onPress={viewApplicants}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#333",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              View Applicants
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ color: "#666", marginTop: 12, fontSize: 12 }}>
        If this screen is blank, your backend GET /fights/slots/:id isn’t
        implemented.
      </Text>
    </ScrollView>
  );
}

function Card({ children }) {
  return (
    <View
      style={{
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 16,
        padding: 14,
        backgroundColor: "#0b0b0b",
      }}
    >
      {children}
    </View>
  );
}
