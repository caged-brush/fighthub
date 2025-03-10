import { View, Text, Pressable, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import CustomButton from "../component/CustomButton";

const Settings = () => {
  const { logout, completeOnboarding, userId } = useContext(AuthContext);
  const [fighterInfo, setFighterInfo] = useState({
    profile_url: "",
    userId: userId,
  });

  const handleProfilePictureChange = async () => {
    try {
      const response = await axios.put(
        "http://10.50.99.238:5001/change-profile-pic",
        { userId: fighterInfo.userId, profile_url: fighterInfo.profile_url }
      );
      if (response.data) {
        // console.log("Profile picture updated:", response.data);
        setFighterInfo((prevState) => ({
          ...prevState,
          profile_url: response.data.profile_url,
        }));
      }
    } catch (error) {
      console.log(error);
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
