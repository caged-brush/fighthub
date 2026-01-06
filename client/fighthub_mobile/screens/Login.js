import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import React, { useContext, useState } from "react";
import CustomButton from "../component/CustomButton";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#181818",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#181818",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  fighterIcon: {
    backgroundColor: "#232323",
    borderRadius: 50,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 8,
  },
  title: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 28,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#232323",
    borderRadius: 10,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#fff",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  inputPasswordContainer: {
    position: "relative",
    marginBottom: 18,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  forgotText: {
    color: "#ffd700",
    marginBottom: 18,
    fontWeight: "bold",
    textAlign: "right",
  },
  buttonContainer: {
    marginTop: 10,
  },
  loginButton: {
    backgroundColor: "#e0245e",
    marginBottom: 10,
  },
  signupButton: {
    backgroundColor: "#292929",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
});

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
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      if (response.data.token) {
        const { token, userId, role, isOnBoarded } = response.data;
        await login(token, userId, role, isOnBoarded);

        console.log("LOGIN PAYLOAD:", response.data); // keep temporarily
      } else {
        Alert.alert("Error", response.data.message || "Login failed");
      }
    } catch (error) {
      Alert.alert("Error", "Login failed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <View style={styles.fighterIcon}>
            <Ionicons name="body-outline" size={48} color="#ffd700" />
          </View>
          <Text style={styles.title}>Fighthub Login</Text>
        </View>
        <TextInput
          inputMode="email"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={formData.email}
          onChangeText={(value) => handleChange("email", value)}
          autoCapitalize="none"
        />
        <View style={styles.inputPasswordContainer}>
          <TextInput
            secureTextEntry={!showPassword}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={formData.password}
            onChangeText={(value) => handleChange("password", value)}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#ffd700"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <CustomButton style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log in</Text>
          </CustomButton>
          <CustomButton style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign up</Text>
          </CustomButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
