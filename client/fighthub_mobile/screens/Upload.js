import {
  View,
  Text,
  Button,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useContext } from "react";
import axios from "axios";
import { Platform } from "react-native";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffd700",
    marginBottom: 18,
    letterSpacing: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#232323",
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
    shadowColor: "#e0245e",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    alignItems: "center",
    marginBottom: 24,
  },
  pickButton: {
    backgroundColor: "#e0245e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
    flexDirection: "row",
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
    backgroundColor: "#222",
    shadowColor: "#ffd700",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  captionInput: {
    borderColor: "#e0245e",
    borderWidth: 2,
    marginTop: 10,
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
  uploadButtonText: {
    color: "#181818",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  message: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});

const Upload = () => {
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { logout, userId } = useContext(AuthContext);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      setMediaType(result.assets[0].type);
    }
  };

  const uploadMedia = async () => {
    if (!media) return;

    let formData = new FormData();
    formData.append("user_id", userId);
    formData.append("caption", caption);

    let fileType = media.split(".").pop();
    formData.append("media", {
      uri: media,
      name: `upload.${fileType}`,
      type: mediaType === "video" ? `video/${fileType}` : `image/${fileType}`,
    });

    try {
      const response = await axios.post(
        "http://10.50.107.251:5001/post",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setSuccessMessage("Upload successful!");
      setMedia(null);
      setCaption("");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      setSuccessMessage("Upload failed. Please try again.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
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
              <Ionicons name="videocam-outline" size={80} color="#ffd700" />
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
            style={[
              styles.message,
              {
                color:
                  successMessage === "Upload successful!" ? "#0f0" : "#e0245e",
              },
            ]}
          >
            {successMessage}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default Upload;
