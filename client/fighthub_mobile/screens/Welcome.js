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
import Ionicons from "@expo/vector-icons/Ionicons";

const Welcome = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../images/bg_4.jpg")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.centerBox}>
        <View style={styles.iconCircle}>
          <Ionicons name="body-outline" size={60} color="#ffd700" />
        </View>
        <Text style={styles.title}>Fighthub</Text>
        <Text style={styles.subtitle}>
          Take your fighting career to the next level
        </Text>
        <CustomButton
          style={styles.button}
          onPress={() => navigation.navigate("Sign up")}
        >
          Start
        </CustomButton>
        <CustomButton
          style={[styles.button, styles.loginButton]}
          onPress={() => navigation.navigate("Login")}
        >
          Login
        </CustomButton>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24,24,24,0.65)",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  iconCircle: {
    backgroundColor: "#232323",
    borderRadius: 50,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 18,
  },
  title: {
    fontFamily: "CustomFont2-regular",
    fontSize: 48,
    color: "#ffd700",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 2,
    textShadowColor: "#e0245e",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 28,
    fontWeight: "600",
    letterSpacing: 1,
    textShadowColor: "#181818",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  button: {
    width: 180,
    marginBottom: 16,
    backgroundColor: "#e0245e",
  },
  loginButton: {
    backgroundColor: "#232323",
    borderWidth: 2,
    borderColor: "#ffd700",
  },
});

export default Welcome;
