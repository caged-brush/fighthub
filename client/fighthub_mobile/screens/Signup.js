import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import CustomButton from "../component/CustomButton";
import axios from "axios";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [userToken, setUserToken] = useState(null);
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fieldLabels = {
    fname: "First Name",
    lname: "Last Name",
    email: "E-mail",
    password: "Password",
    confirmPassword: "Confirm Password",
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleUserSignup = async () => {
    const { fname, lname, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await axios.post("http://10.50.228.148:5000/register", {
        fname,
        lname,
        email,
        password,
        confirm: confirmPassword,
      });

      if (response.data.token) {
        const { token, userId } = response.data;
        setUserToken(token);
        Alert.alert("Success", "Registration Successful");
        signup(token, userId);
      } else {
        Alert.alert("Error", response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong. Please try again");
    }
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <ScrollView className="p-5">
      {["fname", "lname", "email", "password", "confirmPassword"].map(
        (field, index) => (
          <View className="mt-5" key={index}>
            <Text className="text-white">
              {fieldLabels[field] ||
                field.charAt(0).toUpperCase() + field.slice(1)}
            </Text>
            <View className="relative">
              <TextInput
                className="bg-slate-500 rounded-lg h-10 p-2 pr-12 text-white"
                secureTextEntry={
                  field === "password"
                    ? !showPassword
                    : field === "confirmPassword"
                    ? !showConfirmPassword
                    : false
                }
                onChangeText={(value) => handleChange(field, value)}
                value={formData[field]}
                placeholder={`Enter your ${fieldLabels[field] || field}`}
                placeholderTextColor="gray"
              />
              {field.toLowerCase().includes("password") && (
                <TouchableOpacity
                  onPress={() =>
                    field === "password"
                      ? setShowPassword(!showPassword)
                      : setShowConfirmPassword(!showConfirmPassword)
                  }
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: [{ translateY: -12 }],
                  }}
                >
                  <Ionicons
                    name={
                      field === "password"
                        ? showPassword
                          ? "eye-off"
                          : "eye"
                        : showConfirmPassword
                        ? "eye-off"
                        : "eye"
                    }
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      )}
      <View className="mt-5">
        <CustomButton onPress={handleUserSignup}>
          <Text className="text-white font-bold text-lg">Sign up</Text>
        </CustomButton>

        <CustomButton style={{ marginTop: 10 }} onPress={handleLogin}>
          <Text className="text-white font-bold text-lg">Log in</Text>
        </CustomButton>
      </View>
    </ScrollView>
  );
}
