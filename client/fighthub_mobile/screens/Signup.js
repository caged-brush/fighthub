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

// const [request, response, promptAsync] = Google.useAuthRequest({
//   iosClientId: CLIENT_ID_IOS,
//   androidClientId: CLIENT_ID_ANDROID,
//   webClientId: CLIENT_ID_WEB,
// });

// const redirectUri = Platform.select({
//   ios: 'exp://10.50.99.238:8081',
//   android: 'exp://10.50.99.238:8081',
//   default: 'exp://10.50.99.238:8081', // or you can use a specific URL for the web
// });

const redirectUri = "https://auth.expo.io/@suleimanjb/fighthub_mobile";

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
  console.log("Redirect URI:", redirectUri);
  console.log("Generated redirect URI:", request?.redirectUri);

  const handleChange = (name, value) => {
    if (name === "email") {
      value = value.charAt(0).toLowerCase() + value.slice(1); // Lowercase the first letter of email
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
      const response = await axios.post("http://10.50.99.238:5001/register", {
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

  const signIn = async () => {
    const result = await promptAsync();
    if (result?.type === "success") {
      const { idToken, accessToken } = result.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("User signed in:", userCredential.user);
          // Optionally, handle successful sign-in and navigate or store the token
        })
        .catch((error) => console.log("Error signing in:", error));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
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

            <CustomButton style={{ marginTop: 10 }} onPress={signIn}>
              <Text className="text-white font-bold text-lg">
                Sign up with Google
              </Text>
            </CustomButton>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
