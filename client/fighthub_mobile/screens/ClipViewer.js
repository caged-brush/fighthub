import React, { useEffect, useState, useContext, useMemo } from "react";
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
import { WebView } from "react-native-webview";

import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

export default function ClipViewer({ route, navigation }) {
  const { clip } = route.params;
  const { userToken } = useContext(AuthContext);

  const isYoutube = clip?.source_type === "youtube";
  const youtubeId = clip?.youtube_id || null;

  const embedUrl = useMemo(() => {
    if (!isYoutube || !youtubeId) return null;
    // playsinline helps iOS; rel=0 avoids unrelated suggestions
    return `https://www.youtube.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0`;
  }, [isYoutube, youtubeId]);

  const [url, setUrl] = useState(clip?.signed_url || null);
  const [loading, setLoading] = useState(!isYoutube && !clip?.signed_url);

  useEffect(() => {
    // YouTube clips don't need signed URLs
    if (isYoutube) return;

    // If already have a signed url, use it
    if (url) return;

    const fetchUrl = async () => {
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${userToken}` };
        const res = await axios.get(`${API_URL}/fight-clips/${clip.id}/play`, {
          headers,
        });
        setUrl(res.data?.url || null);
      } catch (e) {
        console.log(
          "PLAY URL ERROR:",
          e?.response?.status,
          e?.response?.data,
          e?.message,
        );
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [clip?.id, isYoutube, url, userToken]);

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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#ffd700", fontWeight: "900", fontSize: 18 }}>
            Fight Clip
          </Text>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: "#232323",
              borderWidth: 1,
              borderColor: "#333",
            }}
          >
            <Text style={{ color: "#bbb", fontSize: 12, fontWeight: "800" }}>
              {isYoutube ? "YouTube" : "Upload"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* PLAYER */}
        {isYoutube ? (
          embedUrl ? (
            <View
              style={{ width: "100%", height: 320, backgroundColor: "#000" }}
            >
              <WebView
                source={{ uri: embedUrl }}
                allowsFullscreenVideo
                javaScriptEnabled
                mediaPlaybackRequiresUserAction={false}
                style={{ flex: 1, backgroundColor: "#000" }}
              />
            </View>
          ) : (
            <Text style={{ color: "#bbb", textAlign: "center" }}>
              YouTube clip unavailable.
            </Text>
          )
        ) : loading ? (
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

        {/* METADATA */}
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

          {/* Optional: show original YouTube URL */}
          {isYoutube && !!clip.youtube_url && (
            <Text style={{ color: "#777", marginTop: 10, fontSize: 12 }}>
              Source: YouTube
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
