import React, { useEffect, useState } from "react";
import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Image } from "react-native";
import axios from "axios";
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
        //console.log(response.data);
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

  return (
    <View className="flex justify-center items-center mt-20">
      <Pressable onPress={handleLogout}>
        <Text className="text-black">Logout</Text>
      </Pressable>
      {/* <Text className="text-black">userId: {userId}</Text> */}
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
      ) : null}
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
      <Text className="text-black">Weight: {fighterInfo.weight}</Text>
      <Text className="text-black">Height: {fighterInfo.height}</Text>
    </View>
  );
};

export default Profile;
