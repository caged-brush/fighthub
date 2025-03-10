import React, { useCallback, useEffect, useState } from "react";
import { useContext } from "react";
import { Pressable, Text, View, ScrollView, RefreshControl } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { createDrawerNavigator } from "@react-navigation/drawer";
import CustomButton from "../component/CustomButton";

const drawer = createDrawerNavigator();
const Profile = () => {
  const { logout, userId } = useContext(AuthContext);

  const [fighterInfo, setFighterInfo] = useState({
    fname: "",
    lname: "",
    wins: 0.0,
    losses: 0.0,
    draws: 0.0,
    style: "",
    weight: 0.0,
    height: 0.0,
    profileUrl: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    console.log("Logging out");
    logout();
  };

  const getUserProfile = async () => {
    const id = userId;
    try {
      const response = await axios.post(
        "http://10.50.99.238:5001/fighter-info",
        { userId: id }
      );
      if (response.data) {
        setFighterInfo({
          fname: response.data.fname || "",
          lname: response.data.lname || "",
          wins: response.data.wins || 0.0,
          losses: response.data.losses || 0.0,
          draws: response.data.draws || 0.0,
          style: response.data.fight_style || "",
          weight: response.data.weight || 0.0,
          height: response.data.height || 0.0,
          profileUrl: response.data.profile_picture_url,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUserProfile();
  }, [userId]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getUserProfile(); // Fetch profile data
    setRefreshing(false);
  }, [userId]);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="flex flex-row p-10 mt-20">
        {fighterInfo.profileUrl ? (
          <Image
            source={{ uri: fighterInfo.profileUrl }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              marginTop: 20,
            }}
          />
        ) : (
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 50,
              borderColor: "black",
              borderWidth: 2,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 20,
              marginBottom: 20,
            }}
          >
            <Ionicons name="person" size={50} color="black" />
          </View>
        )}
        <View className="flex flex-col ml-16">
          <Pressable onPress={handleLogout}>
            <Text className="text-red-500">Logout</Text>
          </Pressable>
          <View className="flex flex-row">
            <Text className="text-black mr-1">{fighterInfo.fname}</Text>
            <Text className="text-black">{fighterInfo.lname}</Text>
          </View>

          <View className="flex flex-row">
            <Text className="text-black">{fighterInfo.wins}-</Text>
            <Text className="text-black">{fighterInfo.losses}-</Text>
            <Text className="text-black">{fighterInfo.draws}</Text>
          </View>

          <Text className="text-black">Style: {fighterInfo.style}</Text>
          <Text className="text-black">Weight: {fighterInfo.weight} lbs</Text>
          <Text className="text-black">Height: {fighterInfo.height} cm</Text>
        </View>
      </View>
      <View className="flex items-center justify-center">
        <CustomButton className="w-96">
          <Text className="font-bold text-white">Edit profile</Text>
        </CustomButton>
      </View>
    </ScrollView>
  );
};

export default Profile;
