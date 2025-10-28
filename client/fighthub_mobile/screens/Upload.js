import React, { useState, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import axios from "axios";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";

const Upload = () => {
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { userId } = useContext(AuthContext);

  // Pick image or video
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia(asset.uri);
      setMediaType(asset.type); // "image" or "video"
    }
  };

  // Upload media
  const uploadMedia = async () => {
    if (!media) return;

    try {
      const fileExt = media.split(".").pop();
      const mimeType =
        mediaType === "video"
          ? `video/${fileExt === "mov" ? "quicktime" : fileExt}`
          : `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("caption", caption);
      formData.append("media", {
        uri: Platform.OS === "ios" ? media.replace("file://", "") : media,
        name: `upload.${fileExt}`,
        type: mimeType,
      });

      const response = await fetch(`${API_URL}/post`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        duplex: "half", // 💀 crucial for iOS + Expo
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error("Upload error:", errData);
        throw new Error("Upload failed");
      }

      setSuccessMessage("Upload successful!");
      setMedia(null);
      setCaption("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Upload error:", err.message);
      setSuccessMessage("Upload failed. Please try again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Upload Fight Media</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.pickButton} onPress={pickMedia}>
          <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
          <Text style={styles.pickButtonText}>Pick Image or Video</Text>
        </TouchableOpacity>

        {media && (
          <View style={styles.mediaPreview}>
            {mediaType === "video" ? (
              <Video
                source={{ uri: media }}
                style={{ width: 210, height: 210, borderRadius: 10 }}
                useNativeControls
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: media }}
                style={{ width: 210, height: 210, borderRadius: 10 }}
              />
            )}
          </View>
        )}

        {media && (
          <>
            <TextInput
              style={styles.captionInput}
              placeholder="Enter a fight caption..."
              placeholderTextColor="#aaa"
              value={caption}
              onChangeText={setCaption}
            />
            <TouchableOpacity style={styles.uploadButton} onPress={uploadMedia}>
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          </>
        )}

        {successMessage ? (
          <Text
            style={{
              marginTop: 20,
              fontWeight: "bold",
              fontSize: 16,
              color: successMessage.includes("successful") ? "#0f0" : "#e0245e",
              textAlign: "center",
            }}
          >
            {successMessage}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181818", padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffd700",
    marginBottom: 18,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#232323",
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 24,
    alignItems: "center",
  },
  pickButton: {
    backgroundColor: "#e0245e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pickButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 8,
  },
  mediaPreview: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#ffd700",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  captionInput: {
    borderColor: "#e0245e",
    borderWidth: 2,
    padding: 12,
    borderRadius: 8,
    color: "#fff",
    backgroundColor: "#232323",
    fontSize: 16,
    width: "100%",
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: "#ffd700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  uploadButtonText: { color: "#181818", fontWeight: "bold", fontSize: 18 },
});

export default Upload;
