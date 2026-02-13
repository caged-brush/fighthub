import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useState } from "react";
import CustomButton from "../component/CustomButton";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/apiFetch";

const Login = () => {
  const navigation = useNavigation();
  const { login } = useContext(AuthContext);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSignup = () => {
    // FIX THIS ROUTE NAME to whatever your navigator uses (e.g. "Signup" or "Welcome")
    navigation.navigate("Welcome");
  };

  const handleChange = (name, value) => {
    if (name === "email") value = value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async () => {
    if (submitting) return;

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email.includes("@"))
      return Alert.alert("Invalid email", "Enter a valid email.");
    if (!password)
      return Alert.alert("Missing password", "Enter your password.");

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Login failed", error.message);
        return;
      }

      const session = data?.session;
      if (!session?.access_token) {
        Alert.alert("Login failed", "No session returned.");
        return;
      }

      // Get role/profile from your backend
      const me = await apiFetch("/auth/me", { token });

      const { role, scout_onboarded, fighter_onboarded } = me.user;

      let isOnboarded = false;

      if (role === "fighter") {
        isOnboarded = fighter_onboarded;
      } else if (role === "scout") {
        isOnboarded = scout_onboarded;
      }

      await login(token, me.user.id, role, isOnboarded);

      if (!isOnboarded) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name:
                role === "fighter" ? "FighterOnboarding" : "ScoutOnboarding",
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }

      // Persist token + role in your app state
    } catch (e) {
      Alert.alert("Login failed", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // wire to your flow later
    Alert.alert("Forgot password", "Add your password reset flow here.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>Kavyx</Text>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Log in to continue. Keep it clean, keep it moving.
              </Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  inputMode="email"
                  style={styles.input}
                  placeholder="you@email.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={formData.email}
                  onChangeText={(v) => handleChange("email", v)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    secureTextEntry={!showPassword}
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Your password"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={formData.password}
                    onChangeText={(v) => handleChange("password", v)}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((s) => !s)}
                    activeOpacity={0.7}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#ffd700"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  activeOpacity={0.8}
                  style={styles.forgotWrap}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <CustomButton
                variant="primary"
                onPress={handleLogin}
                disabled={submitting}
                style={styles.fullWidth}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.loadingText}>Logging in…</Text>
                  </View>
                ) : (
                  "Log in"
                )}
              </CustomButton>

              <CustomButton
                variant="ghost"
                onPress={handleSignup}
                disabled={submitting}
                style={styles.fullWidth}
              >
                Create an account
              </CustomButton>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              New here? Create an account in 30 seconds.
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b0b0b" },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 0,
    justifyContent: "center",
    gap: 14,
  },

  header: { alignItems: "flex-start" },
  brand: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: "#ffd700",
    fontSize: 32,
    fontWeight: "950",
    lineHeight: 36,
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

  forgotWrap: { alignItems: "flex-end", marginTop: 10 },
  forgotText: {
    color: "rgba(255,215,0,0.9)",
    fontWeight: "900",
    fontSize: 13,
  },

  actions: { gap: 10 },
  fullWidth: { width: "100%", borderRadius: 14 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.6,
  },

  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
});

export default Login;
