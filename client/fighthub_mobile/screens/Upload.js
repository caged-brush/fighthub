// UploadFightClipScreen.js
import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; // ✅ legacy API for SDK 54
import * as MediaLibrary from "expo-media-library";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

/** ---------------- helpers ---------------- **/

const guessExt = (uri, fileName) => {
  const fromUri = uri?.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  if (fromUri) return fromUri;

  const fromName = fileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  if (fromName) return fromName;

  return "mp4";
};

const guessMime = (ext) => {
  const e = String(ext || "").toLowerCase();
  if (e === "mov") return "video/quicktime";
  if (e === "mkv") return "video/x-matroska";
  if (e === "webm") return "video/webm";
  if (e === "avi") return "video/x-msvideo";
  return "video/mp4";
};

const toYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isIcloudOffloadError = (err) => {
  const msg = String(err?.message || "");
  return msg.includes("PHPhotosErrorDomain") && msg.includes("3164");
};

// iOS: try localUri for Photos assets
// Android: content:// -> file:// by copying to cache
async function normalizePickedVideo({ uri, assetId, fileName }) {
  if (!uri) throw new Error("Picker returned no uri");

  if (Platform.OS === "ios" && assetId) {
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    const local = info?.localUri || info?.uri;
    if (!local) {
      throw new Error(
        "This video is not available locally (likely iCloud/offloaded). Download it in Photos or use Files picker.",
      );
    }
    uri = local;
  }

  if (Platform.OS === "android" && uri.startsWith("content://")) {
    const ext = guessExt(uri, fileName);
    const target = `${FileSystem.cacheDirectory}clip-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: target });
    uri = target;
  }

  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists) throw new Error("Selected file is not accessible on disk.");

  return { uri, size: info.size ?? null };
}

// Upload using signedUrl from backend.
// iOS: force FOREGROUND to avoid BackgroundUploadTask flakiness.
async function uploadToSignedUrl({ signedUrl, fileUri, mimeType }) {
  const headers = { "Content-Type": mimeType };

  const opts = {
    httpMethod: "PUT",
    headers,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  };

  if (Platform.OS === "ios") {
    opts.sessionType = FileSystem.FileSystemSessionType.FOREGROUND;
  }

  return await FileSystem.uploadAsync(signedUrl, fileUri, opts);
}

/** ---------------- component ---------------- **/

export default function UploadFightClipScreen() {
  const { userToken } = useContext(AuthContext);

  const [video, setVideo] = useState(null); // { uri, size, fileName, assetId? }
  const [opponent, setOpponent] = useState("");
  const [promotion, setPromotion] = useState("");
  const [result, setResult] = useState("win");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  const [fightDateObj, setFightDateObj] = useState(null);
  const [fightDate, setFightDate] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const openDatePicker = () => {
    setTempDate(fightDateObj || new Date());
    setShowDateModal(true);
  };

  const closeDatePicker = () => setShowDateModal(false);

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS === "android") {
      if (selectedDate) {
        setFightDateObj(selectedDate);
        setFightDate(toYMD(selectedDate));
      }
      closeDatePicker();
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const onIosDone = () => {
    setFightDateObj(tempDate);
    setFightDate(toYMD(tempDate));
    closeDatePicker();
  };

  const onIosCancel = () => closeDatePicker();

  /** ---- pickers ---- **/

  const pickFromPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow media library access.");
      return;
    }

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        copyToCacheDirectory: true,
        videoExportPreset:
          ImagePicker.VideoExportPreset?.Passthrough ?? "passthrough",
      });

      if (res.canceled || !res.assets?.length) return;

      const a = res.assets[0];
      const norm = await normalizePickedVideo({
        uri: a.uri,
        assetId: a.assetId,
        fileName: a.fileName,
      });

      setVideo({
        uri: norm.uri,
        size: norm.size,
        fileName: a.fileName || null,
        assetId: a.assetId || null,
      });
    } catch (err) {
      console.log("Photos picker error:", err);

      if (isIcloudOffloadError(err)) {
        Alert.alert(
          "Video is in iCloud",
          "That video isn’t downloaded. Download it in Photos, or tap ‘Pick with Files’.",
        );
        return;
      }

      Alert.alert("Picker error", String(err?.message || err));
    }
  };

  const pickWithFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled || !res.assets?.length) return;

      const a = res.assets[0]; // { uri, name, size }
      const norm = await normalizePickedVideo({
        uri: a.uri,
        assetId: null,
        fileName: a.name,
      });

      setVideo({
        uri: norm.uri,
        size: norm.size ?? a.size ?? null,
        fileName: a.name || null,
        assetId: null,
      });
    } catch (err) {
      console.log("Files picker error:", err);
      Alert.alert("Picker error", String(err?.message || err));
    }
  };

  /** ---- upload ---- **/

  const upload = async () => {
    if (!userToken) return Alert.alert("Auth", "Missing token.");
    if (!video?.uri) return Alert.alert("Missing", "Pick a video first.");

    setLoading(true);

    try {
      const info = await FileSystem.getInfoAsync(video.uri, { size: true });
      if (!info.exists) throw new Error("Video file missing at upload time.");

      const size = info.size ?? video.size ?? null;

      const MAX = 150 * 1024 * 1024;
      if (size && size > MAX) {
        Alert.alert("Too large", "Max 150MB per clip for now.");
        return;
      }

      const ext = guessExt(video.uri, video.fileName);
      const mimeType = guessMime(ext);

      const headers = { Authorization: `Bearer ${userToken}` };

      // 1) Sign via backend (must return signedUrl + storagePath)
      const signRes = await axios.post(
        `${API_URL}/fight-clips/sign-upload`,
        { fileExt: ext, mimeType },
        { headers },
      );

      const { storagePath, signedUrl } = signRes.data || {};
      if (!storagePath || !signedUrl) {
        throw new Error("Sign response missing storagePath/signedUrl");
      }

      // 2) Upload to Supabase Storage signed URL
      const up = await uploadToSignedUrl({
        signedUrl,
        fileUri: video.uri,
        mimeType,
      });

      console.log("UPLOAD RESPONSE:", up.status, up.body);

      if (up.status < 200 || up.status >= 300) {
        throw new Error(`Upload failed (status ${up.status})`);
      }

      // 3) Save metadata
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
          file_size: size,
        },
        { headers },
      );

      Alert.alert("Success", "Fight clip uploaded.");

      // reset
      setVideo(null);
      setFightDate("");
      setFightDateObj(null);
      setOpponent("");
      setPromotion("");
      setResult("win");
      setNotes("");
    } catch (e) {
      console.log("UPLOAD ERROR:", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
        url: e?.config?.url,
      });

      Alert.alert(
        "Error",
        e?.response?.data?.message || e?.message || "Upload failed",
      );
    } finally {
      setLoading(false);
    }
  };

  /** ---------------- UI ---------------- **/

  const sizeLabel =
    video?.size != null
      ? `${(video.size / (1024 * 1024)).toFixed(1)} MB`
      : null;

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#181818" }}>
      <Text style={{ color: "#ffd700", fontSize: 22, fontWeight: "900" }}>
        Upload Fight Clip
      </Text>

      <View style={{ marginTop: 16, gap: 10 }}>
        <TouchableOpacity onPress={pickFromPhotos} disabled={loading}>
          <Text style={{ color: "#fff" }}>
            {video ? "Video selected ✅ (Photos)" : "Pick from Photos"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={pickWithFiles} disabled={loading}>
          <Text style={{ color: "#fff" }}>
            Pick with Files (best for iCloud videos)
          </Text>
        </TouchableOpacity>

        {sizeLabel && <Text style={{ color: "#999" }}>Size: {sizeLabel}</Text>}
      </View>

      <TouchableOpacity
        onPress={openDatePicker}
        activeOpacity={0.8}
        disabled={loading}
        style={{
          marginTop: 12,
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 14,
          borderRadius: 10,
          backgroundColor: "#232323",
        }}
      >
        <Text style={{ color: fightDate ? "#fff" : "#777" }}>
          {fightDate ? fightDate : "Fight date"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={closeDatePicker}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={Platform.OS === "ios" ? onIosCancel : closeDatePicker}
        />

        <View
          style={{
            backgroundColor: "#232323",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingTop: 12,
            paddingBottom: 18,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: "#ffd700",
              fontWeight: "900",
              fontSize: 16,
              marginBottom: 8,
            }}
          >
            Select fight date
          </Text>

          <DateTimePicker
            value={
              Platform.OS === "ios" ? tempDate : fightDateObj || new Date()
            }
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={onChangeDate}
            maximumDate={new Date()}
          />

          {Platform.OS === "ios" && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={onIosCancel}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onIosDone}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: "#ffd700",
                }}
              >
                <Text style={{ color: "#181818", fontWeight: "900" }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <TextInput
        value={opponent}
        onChangeText={setOpponent}
        placeholder="Opponent"
        placeholderTextColor="#777"
        editable={!loading}
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
        editable={!loading}
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
        autoCapitalize="none"
        editable={!loading}
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
        editable={!loading}
        style={{
          marginTop: 12,
          color: "#fff",
          borderWidth: 1,
          borderColor: "#e0245e",
          padding: 10,
          borderRadius: 10,
          minHeight: 80,
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
          flexDirection: "row",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {loading && <ActivityIndicator />}
        <Text style={{ fontWeight: "900", color: "#181818" }}>
          {loading ? "Uploading..." : "Upload"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
