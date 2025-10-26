import { View, Text, Pressable, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import CustomButton from "../component/CustomButton";
import { API_URL } from "../Constants";

const Settings = () => {
  const { logout, completeOnboarding, userId } = useContext(AuthContext);
  const [fighterInfo, setFighterInfo] = useState({
    profile_url: "",
    userId: userId,
  });

  const handleProfilePictureChange = async () => {
    const formData = new FormData();

    formData.append("userId", fighterInfo.userId);
    formData.append("profile_picture", {
      uri: fighterInfo.profile_url,
      name: "profile.jpg", // or get name from result.assets[0].fileName
      type: "image/jpeg", // adjust based on actual type if needed
    });

    try {
      const response = await axios.put(
        `${API_URL}/change-profile-pic`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        setFighterInfo((prevState) => ({
          ...prevState,
          profile_url: `${API_URL}/${response.data.users.profile_picture_url}`,
          // updated URL
        }));
        console.log(
          "Updated image URL:",
          response.data.users.profile_picture_url
        );
      }
    } catch (error) {
      console.error("Upload failed:", error.response?.data || error.message);
    }
  };

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access the media library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFighterInfo((prevState) => ({
        ...prevState,
        profile_url: result.assets[0].uri,
      }));
      //   console.log("Image selected:", result.assets[0].uri);
    } else {
      console.log("No image was selected");
    }
  };

  return (
    <View className="p-6 mt-10">
      <Text className="text-black font-extrabold text-xl">
        Upload Profile Picture
      </Text>
      <TouchableOpacity onPress={handleImagePick} style={{ marginTop: 20 }}>
        <Text className="text-blue-600 text-lg mb-10">
          Change profile picture
        </Text>
      </TouchableOpacity>

      {fighterInfo.profile_url ? (
        <Image
          source={{ uri: fighterInfo.profile_url }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            marginTop: 20,
          }}
        />
      ) : null}

      {fighterInfo.profile_url && (
        <CustomButton onPress={handleProfilePictureChange}>
          <Text className="text-white font-bold text-lg">Finish</Text>
        </CustomButton>
      )}
    </View>
  );
};

export default Settings;
