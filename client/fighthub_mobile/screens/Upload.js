import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import * as FileSystem from "expo-file-system";
import { API_URL } from "../Constants";

const guessExt = (uri) => {
  const m = uri?.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "mp4";
};

const guessMime = (ext) => {
  if (ext === "mov") return "video/quicktime";
  return "video/mp4";
};

export default function UploadFightClipScreen() {
  const { userToken } = useContext(AuthContext);

  const [video, setVideo] = useState(null);
  const [fightDate, setFightDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [promotion, setPromotion] = useState("");
  const [result, setResult] = useState("win");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow media library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!res.canceled) {
      const asset = res.assets[0];
      setVideo(asset); // { uri, fileSize, ... }
    }
  };

  const upload = async () => {
    if (!video?.uri) return Alert.alert("Missing", "Pick a video first.");
    if (!userToken) return Alert.alert("Auth", "Missing token.");

    setLoading(true);
    try {
      const ext = guessExt(video.uri);
      const mimeType = guessMime(ext);

      // 1) sign upload
      const sign = await axios.post(
        `${API_URL}/fight-clips/sign-upload`,
        { fileExt: ext, mimeType },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const { signedUrl, storagePath, token } = sign.data;

      // 2) upload DIRECTLY to Supabase Storage (this will NOT hit your backend)
      const blob = await (await fetch(video.uri)).blob();

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          Authorization: `Bearer ${token}`,
        },
        body: blob,
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        throw new Error(`PUT failed ${putRes.status}: ${text}`);
      }

      // 3) save metadata in DB
      const info = await FileSystem.getInfoAsync(video.uri);
      const fileSize = info?.size ?? null;

      await axios.post(
        `${API_URL}/fight-clips/create`,
        {
          fight_date: fightDate || null,
          opponent: opponent || null,
          promotion: promotion || null,
          result,
          notes: notes || null,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size: fileSize,
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert("Success", "Fight clip uploaded.");
    } catch (e) {
      console.log("UPLOAD ERROR:", e?.response?.data || e?.message || e);
      Alert.alert("Error", e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#181818" }}>
      <Text style={{ color: "#ffd700", fontSize: 22, fontWeight: "900" }}>
        Upload Fight Clip
      </Text>

      <TouchableOpacity onPress={pickVideo} style={{ marginTop: 16 }}>
        <Text style={{ color: "#fff" }}>
          {video ? "Video selected ✅" : "Pick a video"}
        </Text>
      </TouchableOpacity>

      <TextInput
        value={fightDate}
        onChangeText={setFightDate}
        placeholder="Fight date (YYYY-MM-DD)"
        placeholderTextColor="#777"
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
        }}
      />

      <TextInput
        value={opponent}
        onChangeText={setOpponent}
        placeholder="Opponent"
        placeholderTextColor="#777"
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
        }}
      />

      <TextInput
        value={promotion}
        onChangeText={setPromotion}
        placeholder="Promotion"
        placeholderTextColor="#777"
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
        }}
      />

      <TextInput
        value={result}
        onChangeText={setResult}
        placeholder="result: win/loss/draw/nc"
        placeholderTextColor="#777"
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
        }}
      />

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor="#777"
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
        }}
        multiline
      />

      <TouchableOpacity
        onPress={upload}
        disabled={loading}
        style={{
          marginTop: 18,
          backgroundColor: loading ? "#333" : "#ffd700",
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900", color: "#181818" }}>
          {loading ? "Uploading..." : "Upload"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
