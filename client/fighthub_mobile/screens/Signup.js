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
  ActivityIndicator,
} from "react-native";
import CustomButton from "../component/CustomButton";
import axios from "axios";
import { useContext, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CLIENT_ID_ANDROID, CLIENT_ID_IOS, CLIENT_ID_WEB } from "../keys/keys";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import { auth } from "../firebaseConfig";
import { API_URL } from "../Constants";
import { supabase } from "../lib/supabase";

const redirectUri = "https://auth.expo.io/@suleimanjb/fighthub_mobile";

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const selectedRole = route.params?.role; // 'fighter' | 'scout'

  const { signup, setUserRole } = useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roleLabel = useMemo(() => {
    if (selectedRole === "fighter") return "FIGHTER";
    if (selectedRole === "scout") return "SCOUT";
    return null;
  }, [selectedRole]);

  const titleText = useMemo(() => {
    if (selectedRole === "fighter") return "Create your fighter account";
    if (selectedRole === "scout") return "Create your scout account";
    return "Create your account";
  }, [selectedRole]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: CLIENT_ID_IOS,
    androidClientId: CLIENT_ID_ANDROID,
    webClientId: CLIENT_ID_WEB,
    scopes: ["profile", "email"],
    redirectUri,
  });

  const handleChange = (name, value) => {
    if (name === "email") value = value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const { fname, lname, email, password, confirmPassword } = formData;

    if (!selectedRole || !["fighter", "scout"].includes(selectedRole)) {
      Alert.alert("Choose a role", "Go back and pick Fighter or Scout.");
      return false;
    }

    if (!fname.trim() || !lname.trim()) {
      Alert.alert("Missing name", "Enter your first and last name.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Weak password", "Use at least 8 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords mismatch", "Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleUserSignup = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      // 1) Supabase signup (email verification happens automatically)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // optional: your redirect if you have one
          // emailRedirectTo: "kavyx://auth/callback"
        },
      });

      if (error) {
        Alert.alert("Signup failed", error.message);
        return;
      }

      // 2) Tell user to verify email
      Alert.alert(
        "Verify your email",
        "We sent you a verification link. Open it, verify, then come back and log in.",
      );

      // 3) Move them to Login
      navigation.replace("Login", { email, role: selectedRole });
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = () => navigation.navigate("Login");

  const signIn = async () => {
    if (submitting) return;

    const result = await promptAsync();
    if (result?.type === "success") {
      const { idToken, accessToken } = result.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);

      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("User signed in:", userCredential.user);
          Alert.alert("Google Sign-in", "Now connect this to your backend.");
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
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>Kavyx</Text>

              {roleLabel && (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{roleLabel}</Text>
                </View>
              )}

              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subtitle}>
                Use a real email — you’ll need it to verify your account.
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Field
                label="First name"
                value={formData.fname}
                onChangeText={(v) => handleChange("fname", v)}
                placeholder="John"
                autoCapitalize="words"
              />
              <Field
                label="Last name"
                value={formData.lname}
                onChangeText={(v) => handleChange("lname", v)}
                placeholder="Doe"
                autoCapitalize="words"
              />
              <Field
                label="Email"
                value={formData.email}
                onChangeText={(v) => handleChange("email", v)}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <PasswordField
                label="Password"
                value={formData.password}
                onChangeText={(v) => handleChange("password", v)}
                placeholder="At least 8 characters"
                show={showPassword}
                setShow={setShowPassword}
              />

              <PasswordField
                label="Confirm password"
                value={formData.confirmPassword}
                onChangeText={(v) => handleChange("confirmPassword", v)}
                placeholder="Repeat password"
                show={showConfirmPassword}
                setShow={setShowConfirmPassword}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <CustomButton
                variant="primary"
                disabled={submitting}
                onPress={handleUserSignup}
                style={styles.fullWidth}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.loadingText}>Creating account…</Text>
                  </View>
                ) : (
                  "Create account"
                )}
              </CustomButton>

              <CustomButton
                variant="outline"
                disabled={submitting}
                onPress={signIn}
                style={styles.fullWidth}
              >
                <View style={styles.googleRow}>
                  <Ionicons name="logo-google" size={18} color="#ffd700" />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </View>
              </CustomButton>

              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.8}
                style={styles.loginWrap}
              >
                <Text style={styles.loginText}>
                  Already have an account?{" "}
                  <Text style={styles.loginLink}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer note */}
            <Text style={styles.footer}>
              By continuing, you agree to respectful conduct on Kavyx.
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.35)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  show,
  setShow,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShow(!show)}
          activeOpacity={0.7}
          style={styles.eyeBtn}
        >
          <Ionicons name={show ? "eye-off" : "eye"} size={22} color="#ffd700" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b0b0b" },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 0,
    paddingBottom: 28,
    justifyContent: "center",
    gap: 14,
  },

  header: {
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.45)",
    backgroundColor: "rgba(255,215,0,0.08)",
    marginBottom: 12,
  },
  rolePillText: {
    color: "#ffd700",
    fontWeight: "900",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: "#ffd700",
    fontSize: 30,
    fontWeight: "950",
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  field: { marginBottom: 12 },
  label: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  inputWrap: { position: "relative" },
  input: {
    backgroundColor: "#0f0f0f",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    height: 52,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: {
    gap: 10,
    marginTop: 6,
  },
  fullWidth: {
    width: "100%",
    borderRadius: 14,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.6,
  },

  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleText: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.6,
  },

  loginWrap: {
    alignItems: "center",
    paddingTop: 6,
  },
  loginText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  loginLink: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "900",
    textDecorationLine: "underline",
  },

  footer: {
    textAlign: "center",
    marginTop: 10,
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Signup;
