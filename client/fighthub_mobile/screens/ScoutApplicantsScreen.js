import React, { useCallback, useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../lib/apiFetch";

const STATUS_COLORS = {
  submitted: "#8B5CF6",
  viewed: "#3B82F6",
  accepted: "#16A34A",
  rejected: "#DC2626",
};

export default function ScoutApplicantsScreen({ navigation }) {
  const { userToken, role } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [actingId, setActingId] = useState(null);

  const fetchApplicants = async (isRefresh = false) => {
    if (!userToken || role !== "scout") return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await apiFetch("/fights/applications/mine", {
        method: "GET",
        token: userToken,
      });

      setApplications(Array.isArray(res?.applications) ? res.applications : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load applicants.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchApplicants();
    }, [userToken, role]),
  );

  const acceptApplicant = async (applicationId) => {
    try {
      setActingId(applicationId);

      await apiFetch(`/fights/applications/${applicationId}/accept`, {
        method: "POST",
        token: userToken,
      });

      setApplications((prev) =>
        prev.map((item) =>
          item.id === applicationId
            ? { ...item, status: "accepted" }
            : item.fight_slot_id ===
                prev.find((a) => a.id === applicationId)?.fight_slot_id
              ? {
                  ...item,
                  status: item.id === applicationId ? "accepted" : item.status,
                }
              : item,
        ),
      );

      Alert.alert("Success", "Application accepted.");
      fetchApplicants(true);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to accept application.";
      Alert.alert("Error", msg);
    } finally {
      setActingId(null);
    }
  };

  const confirmAccept = (applicationId, fighterName) => {
    Alert.alert(
      "Accept applicant",
      `Accept ${fighterName || "this fighter"} for this fight?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: () => acceptApplicant(applicationId),
        },
      ],
    );
  };

  const renderStatusPill = (status) => {
    const bg = STATUS_COLORS[status] || "#444";

    return (
      <View
        style={{
          backgroundColor: bg,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          alignSelf: "flex-start",
          marginTop: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 12,
            fontWeight: "700",
            textTransform: "capitalize",
          }}
        >
          {status || "unknown"}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const fighterName =
      item?.fighter_name ||
      [item?.fighter_first_name, item?.fighter_last_name]
        .filter(Boolean)
        .join(" ") ||
      "Unknown Fighter";

    const eventTitle = item?.event_title || "Untitled Event";
    const weightClass = item?.weight_class || "N/A";
    const discipline = item?.discipline || "unknown";
    const submittedAt = item?.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : "Unknown date";

    const isAccepted = item?.status === "accepted";
    const isRejected = item?.status === "rejected";
    const busy = actingId === item.id;

    return (
      <View
        style={{
          backgroundColor: "#111",
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#222",
        }}
      >
        <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }}>
          {fighterName}
        </Text>

        <Text style={{ color: "#aaa", marginTop: 6 }}>
          Applied for: {eventTitle}
        </Text>

        <Text style={{ color: "#aaa", marginTop: 4 }}>
          {discipline.toUpperCase()} • {weightClass}
        </Text>

        <Text style={{ color: "#777", marginTop: 4 }}>
          Submitted: {submittedAt}
        </Text>

        {item?.fighter_record ? (
          <Text style={{ color: "#777", marginTop: 4 }}>
            Record: {item.fighter_record}
          </Text>
        ) : null}

        {item?.fighter_gym ? (
          <Text style={{ color: "#777", marginTop: 4 }}>
            Gym: {item.fighter_gym}
          </Text>
        ) : null}

        {renderStatusPill(item?.status)}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("FightOpportunityDetails", {
                slotId: item.fight_slot_id,
              })
            }
            style={{
              backgroundColor: "#222",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              View Fight
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmAccept(item.id, fighterName)}
            disabled={busy || isAccepted || isRejected}
            style={{
              backgroundColor:
                busy || isAccepted || isRejected ? "#333" : "#16A34A",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              opacity: busy || isAccepted || isRejected ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {busy ? "Accepting..." : isAccepted ? "Accepted" : "Accept"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (role !== "scout") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }}>Only scouts can view applicants.</Text>
      </View>
    );
  }

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
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black", padding: 16 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
        Applicants
      </Text>

      <Text style={{ color: "#888", marginTop: 6, marginBottom: 14 }}>
        Review fighters who applied to your fight posts.
      </Text>

      {applications.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            No applicants yet
          </Text>

          <Text
            style={{
              color: "#777",
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Once fighters apply to your published fights, they’ll show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchApplicants(true)}
              tintColor="white"
            />
          }
        />
      )}
    </View>
  );
}
