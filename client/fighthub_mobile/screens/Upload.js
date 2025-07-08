import { View, Text, Button, Image, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useContext } from "react";
import axios from "axios";
import { Platform } from "react-native";
import { AuthContext } from "../context/AuthContext";

const Upload = () => {
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState(""); // State for the caption
  const [successMessage, setSuccessMessage] = useState(""); // State for success message
  const { logout, userId } = useContext(AuthContext);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Allows both images and videos
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
    formData.append("caption", caption); // Include the caption

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
      console.log("Upload successful:", response.data);
      setSuccessMessage("Upload successful!"); // Set success message
      setMedia(null); // Optionally clear the media after successful upload
      setCaption(""); // Optionally clear the caption after upload

      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setSuccessMessage("Upload failed. Please try again."); // Show failure message
      setTimeout(() => {
        setSuccessMessage(""); // Clear failure message after 3 seconds
      }, 3000);
    }
  };

  return (
    <View className="p-10">
      <Text>Upload</Text>
      <Button title="Pick an image or video" onPress={pickMedia} />
      {media && (
        <View>
          {mediaType === "video" ? (
            <Text>Selected Video</Text>
          ) : (
            <Image
              source={{ uri: media }}
              style={{ width: 200, height: 200 }}
            />
          )}

          {/* TextInput for caption */}
          <TextInput
            style={{
              borderColor: "gray",
              borderWidth: 1,
              marginTop: 10,
              padding: 10,
              borderRadius: 5,
            }}
            placeholder="Enter caption"
            value={caption}
            onChangeText={setCaption}
          />

          <Button title="Upload" onPress={uploadMedia} />
        </View>
      )}

      {/* Success/Failure Message */}
      {successMessage ? (
        <Text
          style={{
            marginTop: 20,
            color: successMessage === "Upload successful!" ? "green" : "red",
            fontWeight: "bold",
          }}
        >
          {successMessage}
        </Text>
      ) : null}
    </View>
  );
};

export default Upload;
