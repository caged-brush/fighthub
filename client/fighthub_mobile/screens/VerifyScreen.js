import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import axios from "axios";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomButton from "../component/CustomButton";
import { API_URL } from "../Constants";
import { AuthContext } from "../context/AuthContext";

const OTP_LEN = 6;
const RESEND_SECONDS = 30;

export default function VerifyEmail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signup } = useContext(AuthContext);

  const email = route?.params?.email;
  const passedRole = route?.params?.role;

  const [digits, setDigits] = useState(Array(OTP_LEN).fill(""));
  const [loading, setLoading] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const isComplete = code.length === OTP_LEN && !digits.includes("");

  useEffect(() => {
    // focus first input on mount
    setTimeout(() => inputsRef.current?.[0]?.focus?.(), 150);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const setDigitAt = (index, value) => {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
  };

  const handleChange = (index, value) => {
    // keep only digits
    const cleaned = (value || "").replace(/\D/g, "");

    // Paste full code
    if (cleaned.length > 1) {
      const sliced = cleaned.slice(0, OTP_LEN).split("");
      const next = Array(OTP_LEN).fill("");
      for (let i = 0; i < sliced.length; i++) next[i] = sliced[i];
      setDigits(next);

      const last = Math.min(sliced.length, OTP_LEN) - 1;
      inputsRef.current?.[last]?.focus?.();
      return;
    }

    // Normal single digit
    setDigitAt(index, cleaned);

    if (cleaned && index < OTP_LEN - 1) {
      inputsRef.current?.[index + 1]?.focus?.();
    }
  };

  const handleKeyPress = (index, e) => {
    if (e.nativeEvent.key === "Backspace") {
      if (digits[index]) {
        // clear current
        setDigitAt(index, "");
      } else if (index > 0) {
        // go back
        inputsRef.current?.[index - 1]?.focus?.();
        setDigitAt(index - 1, "");
      }
    }
  };

  const verify = async () => {
    if (!email) {
      Alert.alert("Missing email", "Go back and sign up again.");
      return;
    }
    if (!isComplete) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/verify-email`, {
        email,
        code,
      });

      const { token, userId, role } = res.data || {};
      if (!token || !userId || !role) {
        console.log("BAD VERIFY RESPONSE:", res.data);
        Alert.alert("Error", "Verification failed. Try again.");
        return;
      }

      await signup(token, userId, role);

      // Go to onboarding after verified
    } catch (error) {
      console.error("Verify error:", error.response?.data || error.message);
      Alert.alert(
        "Verification failed",
        error.response?.data?.message || "Invalid or expired code",
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) return;
    if (secondsLeft > 0) return;

    setResending(true);
    try {
      // You need to implement this endpoint in backend:
      // POST /resend-verification { email }
      await axios.post(`${API_URL}/resend-verification`, { email });

      setDigits(Array(OTP_LEN).fill(""));
      setSecondsLeft(RESEND_SECONDS);
      setTimeout(() => inputsRef.current?.[0]?.focus?.(), 150);

      Alert.alert("Sent", "A new code has been sent to your email.");
    } catch (error) {
      console.error("Resend error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not resend code",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={42}
                  color="#ffd700"
                />
              </View>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{"\n"}
                <Text style={styles.email}>{email || "your email"}</Text>
              </Text>

              {!!passedRole && (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>
                    {passedRole.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputsRef.current[i] = r)}
                  value={d}
                  onChangeText={(v) => handleChange(i, v)}
                  onKeyPress={(e) => handleKeyPress(i, e)}
                  keyboardType="number-pad"
                  maxLength={i === 0 ? OTP_LEN : 1} // allow paste in first box
                  returnKeyType="done"
                  style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                  placeholder="•"
                  placeholderTextColor="#6b7280"
                  selectionColor="#ffd700"
                />
              ))}
            </View>

            <CustomButton
              onPress={verify}
              disabled={!isComplete || loading}
              style={{ opacity: !isComplete || loading ? 0.6 : 1 }}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify"}
              </Text>
            </CustomButton>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn’t receive a code?</Text>
              <TouchableOpacity
                onPress={resend}
                disabled={secondsLeft > 0 || resending}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (secondsLeft > 0 || resending) && styles.resendDisabled,
                  ]}
                >
                  {resending
                    ? "Sending..."
                    : secondsLeft > 0
                      ? `Resend in ${secondsLeft}s`
                      : "Resend code"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backRow}
            >
              <Ionicons name="chevron-back" size={18} color="#ffd700" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#181818" },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#181818",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 26 },
  iconWrap: {
    backgroundColor: "#232323",
    borderRadius: 50,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 10,
  },
  title: {
    color: "#ffd700",
    fontWeight: "800",
    fontSize: 26,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: "#c7c7c7",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 14,
  },
  email: { color: "#ffd700", fontWeight: "700" },

  rolePill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffd700",
    backgroundColor: "#232323",
  },
  rolePillText: { color: "#ffd700", fontWeight: "800" },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 18,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0245e",
    backgroundColor: "#232323",
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#ffd700",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  resendRow: {
    marginTop: 16,
    alignItems: "center",
    gap: 6,
  },
  resendText: { color: "#9ca3af", fontSize: 13 },
  resendLink: { color: "#ffd700", fontWeight: "800" },
  resendDisabled: { color: "#6b7280" },

  backRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  backText: { color: "#ffd700", fontWeight: "700" },
});
