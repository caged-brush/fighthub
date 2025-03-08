import React from "react";
import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";
const Profile = () => {
  const { logout, userId } = useContext(AuthContext);

  const handleLogout = () => {
    console.log("Logging out");
    logout();
  };
  return (
    <View className="flex justify-center items-center mt-20">
      <Pressable onPress={handleLogout}>
        <Text className="text-black">Logout</Text>
      </Pressable>
      <Text className="text-white">userId: {userId}</Text>
    </View>
  );
};

export default Profile;
