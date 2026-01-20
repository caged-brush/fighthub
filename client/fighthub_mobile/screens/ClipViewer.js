import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

export default function ClipViewer({ route, navigation }) {
  const { clip } = route.params;
  const { userToken } = useContext(AuthContext);

  const [url, setUrl] = useState(clip?.signed_url || null);
  const [loading, setLoading] = useState(!clip?.signed_url);

  useEffect(() => {
    // If you already got signed_url from /user/:id, no need to refresh.
    // But if it's missing/expired, fetch a new one:
    const fetchUrl = async () => {
      if (url) return;
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${userToken}` };
        const res = await axios.get(`${API_URL}/fight-clips/${clip.id}/play`, {
          headers,
        });
        setUrl(res.data?.url || null);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [clip?.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#181818" }}>
      <View
        style={{
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#ffd700" />
        </TouchableOpacity>
        <Text style={{ color: "#ffd700", fontWeight: "900", fontSize: 18 }}>
          Fight Clip
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        {loading ? (
          <ActivityIndicator size="large" color="#ffd700" />
        ) : url ? (
          <Video
            source={{ uri: url }}
            style={{ width: "100%", height: 320, backgroundColor: "#000" }}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        ) : (
          <Text style={{ color: "#bbb", textAlign: "center" }}>
            Clip unavailable.
          </Text>
        )}

        <View style={{ padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
            {clip.promotion || "—"} {clip.opponent ? `vs ${clip.opponent}` : ""}
          </Text>
          <Text style={{ color: "#bbb", marginTop: 6 }}>
            {clip.fight_date || "—"} • {clip.weight_class || "—"} •{" "}
            {clip.result || "—"}
          </Text>
          {!!clip.notes && (
            <Text style={{ color: "#ddd", marginTop: 10, lineHeight: 18 }}>
              {clip.notes}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
