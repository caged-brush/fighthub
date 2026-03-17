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

export default function ScoutPublishedFightsScreen({ navigation }) {
  const { userToken, role } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fights, setFights] = useState([]);

  const fetchFights = async (isRefresh = false) => {
    if (!userToken || role !== "scout") return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await apiFetch("/fights/opportunities/mine", {
        method: "GET",
        token: userToken,
      });

      setFights(res?.opportunities || []);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load fights.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFights();
    }, [userToken]),
  );

  const renderItem = ({ item }) => {
    const title = item?.event_title || "Untitled Event";
    const discipline = item?.discipline || "unknown";
    const weightClass = item?.weight_class || "N/A";
    const city = item?.city || "Unknown";
    const region = item?.region || "";
    const date = item?.event_date
      ? new Date(item.event_date).toDateString()
      : "No date";

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("FightOpportunityDetails", {
            slotId: item.id,
          })
        }
        style={{
          backgroundColor: "#111",
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#222",
        }}
      >
        {/* Title */}
        <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }}>
          {title}
        </Text>

        {/* Meta */}
        <Text style={{ color: "#aaa", marginTop: 6 }}>
          {discipline.toUpperCase()} • {weightClass}
        </Text>

        <Text style={{ color: "#aaa", marginTop: 4 }}>
          {city}, {region}
        </Text>

        <Text style={{ color: "#aaa", marginTop: 4 }}>{date}</Text>

        {/* Status */}
        <View
          style={{
            marginTop: 10,
            alignSelf: "flex-start",
            backgroundColor: item.allow_applications ? "#1d3b27" : "#3a2020",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
            {item.allow_applications ? "Applications Open" : "Closed"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 🚫 Not scout
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
        <Text style={{ color: "white" }}>
          Only scouts can view this section.
        </Text>
      </View>
    );
  }

  // ⏳ Loading
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
      {/* Header */}
      <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
        My Published Fights
      </Text>

      <Text style={{ color: "#888", marginTop: 6, marginBottom: 14 }}>
        Manage all fight opportunities you’ve posted.
      </Text>

      {/* Empty state */}
      {fights.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            No fights yet
          </Text>

          <Text
            style={{
              color: "#777",
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Create your first fight opportunity and it will appear here.
          </Text>

          <TouchableOpacity
            onPress={
              () => navigation.navigate("CreatePost") // top tab route
            }
            style={{
              marginTop: 20,
              backgroundColor: "white",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "black", fontWeight: "800" }}>
              Create Fight Post
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={fights}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFights(true)}
              tintColor="white"
            />
          }
        />
      )}
    </View>
  );
}
