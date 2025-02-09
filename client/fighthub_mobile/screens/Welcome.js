import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import CustomButton from "../component/CustomButton";
import Signup from "./Signup";

const Welcome = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../images/bg_4.jpg")}
      className="flex-1"
      resizeMode="cover"
    >
      <View className="flex-1 justify-center items-center px-6 mt-80">
        <Text
          className=" text-red-700 text-5xl font-bold text-center mb-4"
          style={style.title}
        >
          Fightology!
        </Text>
        <Text className="text-white text-center text-base mb-6">
          Take your fighting career to the next level
        </Text>
        <CustomButton
          className="w-48 py-3 rounded-lg"
          onPress={() => navigation.navigate("Sign up")}
        >
          <Text className="text-white font-bold text-center">Start</Text>
        </CustomButton>
        <CustomButton
          className="w-48 py-3 rounded-lg mt-5"
          onPress={() => navigation.navigate("Login")}
        >
          <Text className="text-white font-bold text-center">Login</Text>
        </CustomButton>
      </View>
    </ImageBackground>
  );
};

const style = StyleSheet.create({
  title: {
    fontFamily: "CustomFont2-regular",
    fontSize: 50,
  },
});

export default Welcome;
