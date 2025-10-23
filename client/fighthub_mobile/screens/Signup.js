import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import CustomButton from "../component/CustomButton";
import axios from "axios";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CLIENT_ID_ANDROID, CLIENT_ID_IOS, CLIENT_ID_WEB } from "../keys/keys";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import { auth } from "../firebaseConfig";

const redirectUri = "https://auth.expo.io/@suleimanjb/fighthub_mobile";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#181818",
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#181818",
    justifyContent: "center",
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
  fieldContainer: {
    marginTop: 18,
  },
  label: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "#232323",
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 6,
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  buttonGroup: {
    marginTop: 24,
  },
  button: {
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
});

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

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: CLIENT_ID_IOS,
    androidClientId: CLIENT_ID_ANDROID,
    webClientId: CLIENT_ID_WEB,
    scopes: ["profile", "email"],
    redirectUri: redirectUri,
  });

  const handleChange = (name, value) => {
    if (name === "email") {
      value = value.charAt(0).toLowerCase() + value.slice(1);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleUserSignup = async () => {
    const { fname, lname, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await axios.post("http://10.50.107.251:5001/register", {
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
      console.error("Signup Axios error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Something went wrong. Please try again"
      );
    }
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const signIn = async () => {
    const result = await promptAsync();
    if (result?.type === "success") {
      const { idToken, accessToken } = result.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("User signed in:", userCredential.user);
        })
        .catch((error) => console.log("Error signing in:", error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.logoContainer}>
              <View style={styles.fighterIcon}>
                <Ionicons name="body-outline" size={48} color="#ffd700" />
              </View>
              <Text style={styles.title}>Fighthub Signup</Text>
            </View>
            {["fname", "lname", "email", "password", "confirmPassword"].map(
              (field, index) => (
                <View style={styles.fieldContainer} key={index}>
                  <Text style={styles.label}>
                    {fieldLabels[field] ||
                      field.charAt(0).toUpperCase() + field.slice(1)}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
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
                      placeholderTextColor="#aaa"
                      autoCapitalize={field === "email" ? "none" : "words"}
                    />
                    {field.toLowerCase().includes("password") && (
                      <TouchableOpacity
                        onPress={() =>
                          field === "password"
                            ? setShowPassword(!showPassword)
                            : setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={styles.eyeIcon}
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
                          color="#ffd700"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            )}
            <View style={styles.buttonGroup}>
              <CustomButton style={styles.button} onPress={handleUserSignup}>
                <Text style={styles.buttonText}>Sign up</Text>
              </CustomButton>
              <CustomButton style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Log in</Text>
              </CustomButton>
              <CustomButton style={styles.button} onPress={signIn}>
                <Text style={styles.buttonText}>Sign up with Google</Text>
              </CustomButton>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
