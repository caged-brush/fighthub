// UploadFightClipScreen.js
import React, { useState, useContext, useMemo } from "react";
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
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
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

const extractYouTubeId = (url) => {
  if (!url) return null;
  const s = String(url).trim();
  let m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];
  m = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];
  m = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];
  m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];
  return null;
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

  const [video, setVideo] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [promotion, setPromotion] = useState("");
  const [result, setResult] = useState("win");
  const [notes, setNotes] = useState("");
  const [clipMode, setClipMode] = useState("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const [fightDateObj, setFightDateObj] = useState(null);
  const [fightDate, setFightDate] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const sizeLabel = useMemo(() => {
    if (video?.size == null) return null;
    return `${(video.size / (1024 * 1024)).toFixed(1)} MB`;
  }, [video?.size]);

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
      if (isIcloudOffloadError(err)) {
        Alert.alert(
          "Video is in iCloud",
          "That video isn’t downloaded. Download it in Photos, or use Files picker.",
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

      const a = res.assets[0];
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
      Alert.alert("Picker error", String(err?.message || err));
    }
  };

  const clearMedia = () => {
    setVideo(null);
    setYoutubeUrl("");
  };

  /** ---- upload ---- **/
  const upload = async () => {
    if (!userToken) return Alert.alert("Auth", "Missing token.");

    const authHeaders = {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    };

    const safeJson = async (res) => {
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    };

    // YouTube mode
    if (clipMode === "youtube") {
      const id = extractYouTubeId(youtubeUrl);
      if (!id) return Alert.alert("Invalid", "Paste a valid YouTube URL.");

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/fight-clips/create-youtube`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            youtube_url: youtubeUrl.trim(),
            fight_date: fightDate || null,
            opponent: opponent || null,
            promotion: promotion || null,
            result,
            notes: notes || null,
          }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
          throw new Error(data?.message || "Failed to add YouTube clip");
        }

        Alert.alert("Success", "YouTube fight clip added.");
        clearMedia();
        setFightDate("");
        setFightDateObj(null);
        setOpponent("");
        setPromotion("");
        setResult("win");
        setNotes("");
        return;
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to add YouTube clip");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Upload mode
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

      // 1) Sign upload
      const signRes = await fetch(`${API_URL}/fight-clips/sign-upload`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ fileExt: ext, mimeType }),
      });

      const signData = await safeJson(signRes);

      if (!signRes.ok) {
        throw new Error(signData?.message || "Failed to sign upload");
      }

      const { storagePath, signedUrl } = signData || {};
      if (!storagePath || !signedUrl) {
        throw new Error("Sign response missing storagePath/signedUrl");
      }

      // 2) Upload to signed URL (this is NOT your API; it’s storage)
      // IMPORTANT: do NOT send your Bearer token here.
      const up = await uploadToSignedUrl({
        signedUrl,
        fileUri: video.uri,
        mimeType,
      });

      if (up.status < 200 || up.status >= 300) {
        throw new Error(`Upload failed (status ${up.status})`);
      }

      // 3) Create clip record in your DB
      const createRes = await fetch(`${API_URL}/fight-clips/create`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          fight_date: fightDate || null,
          opponent: opponent || null,
          promotion: promotion || null,
          result,
          notes: notes || null,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size: size,
        }),
      });

      const createData = await safeJson(createRes);

      if (!createRes.ok) {
        throw new Error(createData?.message || "Failed to create clip record");
      }

      Alert.alert("Success", "Fight clip uploaded.");

      // reset
      clearMedia();
      setFightDate("");
      setFightDateObj(null);
      setOpponent("");
      setPromotion("");
      setResult("win");
      setNotes("");
    } catch (e) {
      Alert.alert("Error", e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    (clipMode === "youtube" ? youtubeUrl.trim().length > 0 : !!video?.uri);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Kavyx</Text>
          <Text style={styles.title}>Add a fight clip</Text>
          <Text style={styles.subtitle}>
            Upload a video or link a YouTube fight. Keep it clean and accurate.
          </Text>
        </View>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setClipMode("upload")}
            activeOpacity={0.85}
            style={[styles.tab, clipMode === "upload" && styles.tabActive]}
            disabled={loading}
          >
            <Text
              style={[
                styles.tabText,
                clipMode === "upload" && styles.tabTextActive,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setClipMode("youtube")}
            activeOpacity={0.85}
            style={[styles.tab, clipMode === "youtube" && styles.tabActive]}
            disabled={loading}
          >
            <Text
              style={[
                styles.tabText,
                clipMode === "youtube" && styles.tabTextActive,
              ]}
            >
              YouTube
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {clipMode === "upload" ? "Video file" : "YouTube link"}
          </Text>

          {clipMode === "upload" ? (
            <>
              <View style={styles.mediaRow}>
                <View style={styles.mediaBadge}>
                  <Text style={styles.mediaBadgeText}>
                    {video?.uri ? "SELECTED" : "NONE"}
                  </Text>
                </View>

                {!!sizeLabel && (
                  <Text style={styles.sizeText}>{sizeLabel}</Text>
                )}
              </View>

              <View style={styles.mediaButtons}>
                <CustomButton
                  variant="primary"
                  onPress={pickFromPhotos}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Pick Photos
                </CustomButton>

                <CustomButton
                  variant="outline"
                  onPress={pickWithFiles}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Pick Files
                </CustomButton>
              </View>

              {video?.fileName ? (
                <Text style={styles.fileName} numberOfLines={1}>
                  {video.fileName}
                </Text>
              ) : null}

              {video?.uri ? (
                <TouchableOpacity
                  onPress={clearMedia}
                  activeOpacity={0.8}
                  style={styles.clearLink}
                  disabled={loading}
                >
                  <Text style={styles.clearText}>Remove selection</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="Paste YouTube URL"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {!!youtubeUrl && (
                <TouchableOpacity
                  onPress={clearMedia}
                  activeOpacity={0.8}
                  style={styles.clearLink}
                  disabled={loading}
                >
                  <Text style={styles.clearText}>Clear link</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fight details</Text>

          <TouchableOpacity
            onPress={openDatePicker}
            activeOpacity={0.85}
            disabled={loading}
            style={styles.selectField}
          >
            <Text
              style={[
                styles.selectText,
                !fightDate && styles.selectPlaceholder,
              ]}
            >
              {fightDate || "Fight date (optional)"}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={opponent}
            onChangeText={setOpponent}
            placeholder="Opponent (optional)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!loading}
            style={styles.input}
            autoCapitalize="words"
          />

          <TextInput
            value={promotion}
            onChangeText={setPromotion}
            placeholder="Promotion (optional)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!loading}
            style={styles.input}
            autoCapitalize="words"
          />

          {/* Result pills */}
          <Text style={styles.fieldLabel}>Result</Text>
          <View style={styles.resultRow}>
            {["win", "loss", "draw", "nc"].map((r) => {
              const active = result === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setResult(r)}
                  activeOpacity={0.85}
                  disabled={loading}
                  style={[styles.resultPill, active && styles.resultPillActive]}
                >
                  <Text
                    style={[
                      styles.resultText,
                      active && styles.resultTextActive,
                    ]}
                  >
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!loading}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={280}
          />

          <Text style={styles.charCount}>{notes.trim().length}/280</Text>
        </View>

        {/* Submit */}
        <CustomButton
          variant="primary"
          onPress={upload}
          disabled={!canSubmit}
          style={{ marginTop: 10 }}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>
                {clipMode === "youtube" ? "Saving…" : "Uploading…"}
              </Text>
            </View>
          ) : clipMode === "youtube" ? (
            "Add YouTube clip"
          ) : (
            "Upload clip"
          )}
        </CustomButton>
      </ScrollView>

      {/* Date modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={closeDatePicker}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={Platform.OS === "ios" ? onIosCancel : closeDatePicker}
        />

        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select fight date</Text>

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
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={onIosCancel}
                style={styles.modalBtnGhost}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onIosDone}
                style={styles.modalBtnPrimary}
              >
                <Text style={styles.modalBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  container: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    paddingBottom: 28,
    gap: 12,
  },

  header: { marginBottom: 6 },
  brand: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: "#ffd700",
    fontSize: 30,
    fontWeight: "950",
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 360,
  },

  tabs: {
    flexDirection: "row",
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tabActive: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.35)",
  },
  tabText: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: "#ffd700",
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  sectionTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "950",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  mediaBadgeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  sizeText: { color: "rgba(255,255,255,0.55)", fontWeight: "800" },

  mediaButtons: { flexDirection: "row", gap: 10, marginTop: 12 },

  fileName: {
    marginTop: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
  },

  clearLink: { marginTop: 10, alignSelf: "flex-start" },
  clearText: {
    color: "rgba(255,215,0,0.9)",
    fontWeight: "900",
    textDecorationLine: "underline",
  },

  input: {
    marginTop: 10,
    backgroundColor: "#0f0f0f",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  selectField: {
    backgroundColor: "#0f0f0f",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  selectText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  selectPlaceholder: { color: "rgba(255,255,255,0.35)", fontWeight: "700" },

  fieldLabel: {
    marginTop: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: 12,
  },

  resultRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  resultPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  resultPillActive: {
    backgroundColor: "rgba(255,215,0,0.14)",
    borderColor: "rgba(255,215,0,0.40)",
  },
  resultText: { color: "rgba(255,255,255,0.7)", fontWeight: "900" },
  resultTextActive: { color: "#ffd700" },

  textArea: { height: 120, paddingTop: 14, paddingBottom: 14 },
  charCount: {
    color: "rgba(255,255,255,0.35)",
    marginTop: 8,
    textAlign: "right",
  },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  modalSheet: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalTitle: {
    color: "#ffd700",
    fontWeight: "950",
    fontSize: 16,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  modalBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalBtnGhostText: { color: "#fff", fontWeight: "800" },
  modalBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ffd700",
  },
  modalBtnPrimaryText: { color: "#0b0b0b", fontWeight: "950" },
});
