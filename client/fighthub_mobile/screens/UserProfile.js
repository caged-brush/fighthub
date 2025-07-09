import React from "react";
import Profile from "./Profile";
import { View } from "react-native";

const UserProfile = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <Profile />
    </View>
  );
};

export default UserProfile;
