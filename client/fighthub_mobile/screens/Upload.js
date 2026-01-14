import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import base64 from "base64-js";

import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import { supabase } from "../lib/supabase";

const guessExt = (uri) => {
  const m = uri?.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "mp4";
};

const guessMime = (ext) => (ext === "mov" ? "video/quicktime" : "video/mp4");

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
      setVideo(res.assets[0]); // { uri, fileSize, ... }
    }
  };

  const upload = async () => {
    if (!video?.uri) return Alert.alert("Missing", "Pick a video first.");
    if (!userToken) return Alert.alert("Auth", "Missing token.");

    setLoading(true);

    try {
      const ext = guessExt(video.uri);
      const mimeType = guessMime(ext);

      console.log("🎬 Picked:", {
        uri: video.uri,
        ext,
        mimeType,
        fileSize: video.fileSize,
      });

      // 1) Sign upload (Render)
      console.log("➡️ Signing upload...");
      const signRes = await axios.post(
        `${API_URL}/fight-clips/sign-upload`,
        { fileExt: ext, mimeType },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const { storagePath, token } = signRes.data;

      if (!storagePath || !token) {
        throw new Error("Sign response missing storagePath or token");
      }

      console.log("✅ Signed:", { storagePath });

      // 2) Read file -> base64 -> ArrayBuffer
      console.log("➡️ Reading file as base64...");
      const base64Data = await FileSystem.readAsStringAsync(video.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const bytes = base64.toByteArray(base64Data);
      const arrayBuffer = bytes.buffer;

      console.log("✅ File ready:", { byteLength: bytes.length });

      // 3) Upload bytes DIRECTLY to Supabase Storage (no Render)
      console.log("➡️ Uploading directly to Supabase...");
      const { error: upErr } = await supabase.storage
        .from("fight_clips")
        .uploadToSignedUrl(storagePath, token, arrayBuffer, {
          contentType: mimeType,
        });

      if (upErr) {
        console.log("❌ Supabase upload error:", upErr);
        throw new Error(`Signed upload failed: ${upErr.message}`);
      }

      console.log("✅ Supabase upload done");

      // 4) Save metadata in DB (Render)
      console.log("➡️ Saving metadata...");
      const fileSize = video?.fileSize ?? bytes.length ?? null;

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

      console.log("✅ Metadata saved");
      Alert.alert("Success", "Fight clip uploaded.");

      // reset
      setVideo(null);
      setFightDate("");
      setOpponent("");
      setPromotion("");
      setResult("win");
      setNotes("");
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
