import React, { useContext, useMemo, useState } from "react";
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
import { AuthContext } from "../context/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
//import { CLIENT_ID_ANDROID, CLIENT_ID_IOS, CLIENT_ID_WEB } from "../keys/keys";
//import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
//import * as Google from "expo-auth-session/providers/google";
//import { auth } from "../firebaseConfig";
import { supabase } from "../lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { API_URL } from "../Constants";

//const redirectUri = "https://auth.expo.io/@suleimanjb/fighthub_mobile";
const VALID_ROLES = ["fighter", "scout", "coach"];

// Same corner-accent system as the Welcome screen, so the visual language
// (letter badge + corner color + corner label) carries through the flow.
const ROLE_ACCENTS = {
  fighter: {
    solid: "#D6473F",
    wash: "rgba(214,71,63,0.08)",
    letter: "F",
    corner: "RED CORNER",
  },
  scout: {
    solid: "#D9A441",
    wash: "rgba(217,164,65,0.08)",
    letter: "S",
    corner: "GOLD CORNER",
  },
  coach: {
    solid: "#4A7FA7",
    wash: "rgba(74,127,167,0.08)",
    letter: "C",
    corner: "BLUE CORNER",
  },
};

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const selectedRole = route.params?.role;

  const { setUserRole } = useContext(AuthContext);
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

  console.log("Selected role:", selectedRole);

  const accent = ROLE_ACCENTS[selectedRole] || {
    solid: "#E8B84B",
    wash: "rgba(232,184,75,0.08)",
    letter: "K",
    corner: "KAVYX",
  };

  const titleText = useMemo(() => {
    if (selectedRole === "fighter") return "Create your fighter account";
    if (selectedRole === "scout") return "Create your scout account";
    if (selectedRole === "coach") return "Create your coach account";
    return "Create your account";
  }, [selectedRole]);

  // const [, , promptAsync] = Google.useAuthRequest({
  //   iosClientId: CLIENT_ID_IOS,
  //   androidClientId: CLIENT_ID_ANDROID,
  //   webClientId: CLIENT_ID_WEB,
  //   scopes: ["profile", "email"],
  //   redirectUri,
  // });

  const handleChange = (name, value) => {
    if (name === "email") value = value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const { fname, lname, email, password, confirmPassword } = formData;

    if (!selectedRole || !VALID_ROLES.includes(selectedRole)) {
      Alert.alert("Choose a role", "Please select a valid role.");
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            fname: formData.fname?.trim(),
            lname: formData.lname?.trim(),
          },
          emailRedirectTo: "https://kavyx.tech/verify",
        },
      });

      console.log("SIGNUP RAW:", { data, error });

      if (error) {
        Alert.alert("Signup failed", error.message);
        return;
      }

      if (selectedRole && setUserRole) {
        await setUserRole(selectedRole);
      }

      Alert.alert(
        "Verify your email",
        "We sent you a verification link. Open it, verify, then come back and log in.",
      );

      navigation.replace("Login", {
        email,
        role: selectedRole,
      });
    } catch (e) {
      const msg = String(e?.message || "");
      const friendly =
        msg.includes("Network") ||
        msg.includes("Failed to fetch") ||
        msg.includes("timed out")
          ? "Signup service is temporarily unavailable. Try again in a minute."
          : msg || "Something went wrong";

      Alert.alert("Error", friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const sendDebugLog = async (payload) => {
    try {
      await fetch(`${API_URL}/debug`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.log("Failed to send debug log:", e?.message);
    }
  };

  const handleAppleSignup = async () => {
    if (submitting) return;

    if (!selectedRole || !VALID_ROLES.includes(selectedRole)) {
      Alert.alert("Choose a role", "Please select a valid role.");
      return;
    }

    setSubmitting(true);

    try {
      await sendDebugLog({
        stage: "apple-signup-start",
        selectedRole,
        timestamp: new Date().toISOString(),
      });

      const isAvailable = await AppleAuthentication.isAvailableAsync();

      await sendDebugLog({
        stage: "apple-availability",
        isAvailable,
      });

      if (!isAvailable) {
        throw new Error("Apple Sign In is not available on this device.");
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      await sendDebugLog({
        stage: "apple-credential-received",
        hasIdentityToken: !!credential.identityToken,
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        realUserStatus: credential.realUserStatus,
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      await sendDebugLog({
        stage: "supabase-apple-result",
        hasSession: !!data?.session,
        userId: data?.user?.id,
        error: error
          ? {
              message: error.message,
              code: error.code,
              status: error.status,
              name: error.name,
            }
          : null,
      });

      if (error) throw error;

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("No Supabase session returned");
      }

      const roleRes = await fetch(`${API_URL}/auth/set-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const roleJson = await roleRes.json();

      await sendDebugLog({
        stage: "set-role-result",
        ok: roleRes.ok,
        status: roleRes.status,
        response: roleJson,
      });

      if (!roleRes.ok) {
        throw new Error(roleJson.message || "Failed to set role");
      }

      if (selectedRole && setUserRole) {
        await setUserRole(selectedRole);
      }

      navigation.replace("Login", {
        role: selectedRole,
      });
    } catch (e) {
      await sendDebugLog({
        stage: "apple-signup-catch",
        error: {
          message: e?.message,
          code: e?.code,
          status: e?.status,
          name: e?.name,
        },
      });

      Alert.alert(
        "Apple Sign Up failed",
        e?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleLogin = () => navigation.navigate("Login");

  // const signIn = async () => {
  //   if (submitting) return;

  //   const result = await promptAsync();
  //   if (result?.type === "success") {
  //     const { idToken, accessToken } = result.authentication || {};
  //     const credential = GoogleAuthProvider.credential(idToken, accessToken);

  //     signInWithCredential(auth, credential)
  //       .then((userCredential) => {
  //         console.log("User signed in:", userCredential.user);
  //         Alert.alert("Google Sign-in", "Now connect this to your backend.");
  //       })
  //       .catch((error) => console.log("Error signing in:", error));
  //   }
  // };

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
            <View style={styles.header}>
              <Text style={styles.brand}>KAVYX</Text>

              <View style={styles.cornerTagRow}>
                <View
                  style={[
                    styles.letterBadge,
                    { backgroundColor: accent.solid },
                  ]}
                >
                  <Text style={styles.letterBadgeText}>{accent.letter}</Text>
                </View>
                <Text style={[styles.cornerLabel, { color: accent.solid }]}>
                  {accent.corner}
                </Text>
              </View>

              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subtitle}>
                Use a real email — you'll need it to verify your account.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: accent.wash }]}>
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
                accentColor={accent.solid}
              />

              <PasswordField
                label="Confirm password"
                value={formData.confirmPassword}
                onChangeText={(v) => handleChange("confirmPassword", v)}
                placeholder="Repeat password"
                show={showConfirmPassword}
                setShow={setShowConfirmPassword}
                accentColor={accent.solid}
              />
            </View>

            <View style={styles.actions}>
              <CustomButton
                variant="primary"
                disabled={submitting}
                onPress={handleUserSignup}
                style={styles.fullWidth}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#0B0B0C" />
                    <Text style={styles.loadingText}>Creating account...</Text>
                  </View>
                ) : (
                  "Create account"
                )}
              </CustomButton>

              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={12}
                style={{ width: "100%", height: 52 }}
                onPress={handleAppleSignup}
              />

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
        placeholderTextColor="rgba(245,241,232,0.32)"
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
  accentColor,
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
          placeholderTextColor="rgba(245,241,232,0.32)"
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShow(!show)}
          activeOpacity={0.7}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={show ? "eye-off" : "eye"}
            size={22}
            color={accentColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B0B0C" },

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
    color: "#F5F1E8",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 16,
    opacity: 0.9,
  },
  cornerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  letterBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  letterBadgeText: {
    color: "#0B0B0C",
    fontSize: 13,
    fontWeight: "900",
  },
  cornerLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  title: {
    color: "#E8B84B",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "rgba(245,241,232,0.60)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
  },

  field: { marginBottom: 12 },
  label: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  inputWrap: { position: "relative" },
  input: {
    backgroundColor: "#0F0F0F",
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#F5F1E8",
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.10)",
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
    borderRadius: 12,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#0B0B0C",
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
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.6,
  },

  loginWrap: {
    alignItems: "center",
    paddingTop: 6,
  },
  loginText: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 14,
  },
  loginLink: {
    color: "#F5F1E8",
    fontWeight: "900",
    textDecorationLine: "underline",
  },

  footer: {
    textAlign: "center",
    marginTop: 10,
    color: "rgba(245,241,232,0.28)",
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Signup;
