import React, { useCallback, useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Linking,
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
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const openApplicantPreview = (item) => {
    setSelectedApplicant(item);
    setModalVisible(true);
  };

  const closeApplicantPreview = () => {
    setModalVisible(false);
    setSelectedApplicant(null);
  };

  const acceptApplicant = async (applicationId) => {
    try {
      setActingId(applicationId);

      await apiFetch(`/fights/applications/${applicationId}/accept`, {
        method: "POST",
        token: userToken,
      });

      setApplications((prev) =>
        prev.map((item) =>
          item.id === applicationId ? { ...item, status: "accepted" } : item,
        ),
      );

      if (selectedApplicant?.id === applicationId) {
        setSelectedApplicant((prev) =>
          prev ? { ...prev, status: "accepted" } : prev,
        );
      }

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

  const openHighlightVideo = async (url) => {
    if (!url) {
      Alert.alert("No video", "This fighter has no highlight video yet.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Invalid link", "Could not open highlight video.");
      return;
    }

    await Linking.openURL(url);
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

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 14,
          }}
        >
          <TouchableOpacity
            onPress={() => openApplicantPreview(item)}
            style={{
              backgroundColor: "#222",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              View Fighter
            </Text>
          </TouchableOpacity>

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

  const previewName =
    selectedApplicant?.fighter_name ||
    [
      selectedApplicant?.fighter_first_name,
      selectedApplicant?.fighter_last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unknown Fighter";

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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeApplicantPreview}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.72)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "82%",
              padding: 18,
              borderTopWidth: 1,
              borderColor: "#222",
            }}
          >
            <View
              style={{
                width: 48,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#444",
                alignSelf: "center",
                marginBottom: 18,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
                {previewName}
              </Text>

              {selectedApplicant?.fighter_record ? (
                <Text style={{ color: "#aaa", marginTop: 10 }}>
                  Record: {selectedApplicant.fighter_record}
                </Text>
              ) : null}

              {selectedApplicant?.fighter_gym ? (
                <Text style={{ color: "#aaa", marginTop: 8 }}>
                  Gym: {selectedApplicant.fighter_gym}
                </Text>
              ) : null}

              {selectedApplicant?.fighter_region ? (
                <Text style={{ color: "#aaa", marginTop: 8 }}>
                  Region: {selectedApplicant.fighter_region}
                </Text>
              ) : null}

              {selectedApplicant?.fighter_weight_class ? (
                <Text style={{ color: "#aaa", marginTop: 8 }}>
                  Weight Class: {selectedApplicant.fighter_weight_class}
                </Text>
              ) : null}

              {selectedApplicant?.fighter_style ? (
                <Text style={{ color: "#aaa", marginTop: 8 }}>
                  Style: {selectedApplicant.fighter_style}
                </Text>
              ) : null}

              {selectedApplicant?.fighter_bio ? (
                <>
                  <Text
                    style={{
                      color: "white",
                      marginTop: 18,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Bio
                  </Text>
                  <Text style={{ color: "#aaa", marginTop: 8, lineHeight: 22 }}>
                    {selectedApplicant.fighter_bio}
                  </Text>
                </>
              ) : null}

              <Text
                style={{
                  color: "white",
                  marginTop: 18,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Applied For
              </Text>

              <Text style={{ color: "#aaa", marginTop: 8 }}>
                {selectedApplicant?.event_title || "Untitled Event"}
              </Text>

              <Text style={{ color: "#aaa", marginTop: 8 }}>
                {(selectedApplicant?.discipline || "unknown").toUpperCase()} •{" "}
                {selectedApplicant?.weight_class || "N/A"}
              </Text>

              {selectedApplicant
                ? renderStatusPill(selectedApplicant.status)
                : null}

              <View style={{ marginTop: 22, gap: 12 }}>
                <TouchableOpacity
                  onPress={() =>
                    openHighlightVideo(selectedApplicant?.highlight_video_url)
                  }
                  style={{
                    backgroundColor: "#222",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    View Highlight Video
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    closeApplicantPreview();
                    navigation.navigate("FightOpportunityDetails", {
                      slotId: selectedApplicant?.fight_slot_id,
                    });
                  }}
                  style={{
                    backgroundColor: "#222",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    View Fight Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (!selectedApplicant) return;
                    closeApplicantPreview();
                    confirmAccept(selectedApplicant.id, previewName);
                  }}
                  disabled={
                    !selectedApplicant ||
                    actingId === selectedApplicant.id ||
                    selectedApplicant.status === "accepted" ||
                    selectedApplicant.status === "rejected"
                  }
                  style={{
                    backgroundColor:
                      !selectedApplicant ||
                      actingId === selectedApplicant?.id ||
                      selectedApplicant?.status === "accepted" ||
                      selectedApplicant?.status === "rejected"
                        ? "#333"
                        : "#16A34A",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    opacity:
                      !selectedApplicant ||
                      actingId === selectedApplicant?.id ||
                      selectedApplicant?.status === "accepted" ||
                      selectedApplicant?.status === "rejected"
                        ? 0.6
                        : 1,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {actingId === selectedApplicant?.id
                      ? "Accepting..."
                      : selectedApplicant?.status === "accepted"
                        ? "Already Accepted"
                        : "Accept Fighter"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={closeApplicantPreview}
                  style={{
                    backgroundColor: "transparent",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#333",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
