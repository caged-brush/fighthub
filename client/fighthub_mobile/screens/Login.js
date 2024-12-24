import { View, Text, TextInput, Alert, TouchableOpacity } from "react-native";
import React, { useContext, useState } from "react";
import CustomButton from "../component/CustomButton";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";

const Login = () => {
  const navigation = useNavigation();
  const { login } = useContext(AuthContext);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const handleSignup = () => {
    navigation.navigate("Sign up");
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async () => {
    const { email, password } = formData;

    try {
      const response = await axios.post("http://10.50.228.148:5000/login", {
        email,
        password,
      });
      console.log("Response Data:", response.data);
      if (response.data.token) {
        const { token, userId } = response.data;
        setUserToken(token);
        setUserId(userId);
        login(token, userId);
      } else {
        Alert.alert("Error", response.data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View className="flex-1 justify-center p-5">
      <TextInput
        inputMode="email"
        className="bg-slate-500 rounded-lg h-16 p-3 text-lg text-white"
        placeholder="Email"
        placeholderTextColor="white"
        value={formData.email}
        onChangeText={(value) => handleChange("email", value)}
        autoCapitalize="none"
      />
      <View className="relative mt-9">
        <TextInput
          secureTextEntry={!showPassword}
          className="bg-slate-500 rounded-lg h-16 px-3 py-2 text-lg text-white pr-12"
          placeholder="Password"
          placeholderTextColor="white"
          value={formData.password}
          onChangeText={(value) => handleChange("password", value)}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: [{ translateY: -16 }],
          }}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      <Text className="text-gray-400 mt-4">Forgot your password?</Text>
      <View className="mt-5">
        <CustomButton onPress={handleLogin}>
          <Text className="text-white font-bold text-lg">Log in</Text>
        </CustomButton>

        <CustomButton
          style={{ marginTop: 10, backgroundColor: "#292929" }}
          onPress={handleSignup}
        >
          <Text className="text-white font-bold text-lg">Sign up</Text>
        </CustomButton>
      </View>
    </View>
  );
};

export default Login;
