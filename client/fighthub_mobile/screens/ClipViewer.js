import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { WebView } from "react-native-webview";

import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

function YouTubeBlock({ youtubeId, youtubeUrl }) {
  const [failed, setFailed] = useState(false);

  const embedUrl = useMemo(() => {
    if (!youtubeId) return null;
    // nocookie sometimes behaves better; playsinline helps iOS
    return `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0`;
  }, [youtubeId]);

  const openInYouTube = async () => {
    const webUrl =
      youtubeUrl?.trim() ||
      (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);

    // Try open YouTube app first (optional, best UX)
    const appUrl = youtubeId ? `youtube://${youtubeId}` : null;

    try {
      if (appUrl && (await Linking.canOpenURL(appUrl))) {
        return Linking.openURL(appUrl);
      }
      if (webUrl) return Linking.openURL(webUrl);
    } catch (e) {
      console.log("Open YouTube failed:", e?.message || e);
    }
  };

  // If embed fails OR no embedUrl, show fallback UI
  if (!embedUrl || failed) {
    return (
      <View
        style={{
          height: 320,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: "#bbb", textAlign: "center", marginBottom: 12 }}>
          This video can’t be played inside the app (YouTube embed restricted).
        </Text>

        <TouchableOpacity
          onPress={openInYouTube}
          style={{
            backgroundColor: "#ffd700",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#181818", fontWeight: "900" }}>
            Open in YouTube
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height: 320, backgroundColor: "#000" }}>
      <WebView
        source={{ uri: embedUrl }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={true}
        setSupportMultipleWindows={false}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        style={{ flex: 1, backgroundColor: "#000" }}
      />
    </View>
  );
}


const isYoutube = clip?.source_type === "youtube";
const youtubeId = clip?.youtube_id;

const embedUrl = useMemo(() => {
  if (!isYoutube || !youtubeId) return null;
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&modestbranding=1&rel=0`;
}, [isYoutube, youtubeId]);


export default function ClipViewer({ route, navigation }) {
  const { clip } = route.params;
  const { userToken } = useContext(AuthContext);

  const isYoutube = (clip?.source_type || "upload") === "youtube";
  const youtubeId = clip?.youtube_id || null;

  const [url, setUrl] = useState(clip?.signed_url || null);
  const [loading, setLoading] = useState(!isYoutube && !clip?.signed_url);

  useEffect(() => {
    if (isYoutube) return; // YouTube clips don't need signed URLs
    if (url) return; // already have it
    if (!clip?.id) return;

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
          <>
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

            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  clip.youtube_url?.trim() ||
                    `https://www.youtube.com/watch?v=${clip.youtube_id}`,
                )
              }
              style={{
                marginTop: 10,
                marginHorizontal: 16,
                backgroundColor: "#ffd700",
                padding: 12,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: "#181818" }}>
                Open in YouTube
              </Text>
            </TouchableOpacity>
          </>
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

          {isYoutube && (
            <Text style={{ color: "#777", marginTop: 10, fontSize: 12 }}>
              Source: YouTube
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
