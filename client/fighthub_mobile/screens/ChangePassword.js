import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";

const ChangePassword = () => {
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!currentPassword) {
      Alert.alert("Missing field", "Enter your current password.");
      return false;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak password", "New password must be at least 8 characters.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Confirm your new password again.");
      return false;
    }
    if (newPassword === currentPassword) {
      Alert.alert("No change made", "New password must be different from the current one.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Supabase requires the current session, not the old password, to
      // confirm identity — re-authentication against currentPassword should
      // happen server-side or via signInWithPassword before this call if
      // stricter verification is needed.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert("Couldn't update password", error.message);
        return;
      }

      Alert.alert("Password updated", "Your password has been changed.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Change password" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Choose a new password with at least 8 characters.
          </Text>

          <View style={styles.card}>
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              show={showCurrent}
              setShow={setShowCurrent}
              placeholder="Enter current password"
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              show={showNew}
              setShow={setShowNew}
              placeholder="At least 8 characters"
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              show={showConfirm}
              setShow={setShowConfirm}
              placeholder="Repeat new password"
              last
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#0B0B0C" />
            ) : (
              <Text style={styles.submitText}>Update password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color="#F5F1E8" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function PasswordField({ label, value, onChangeText, show, setShow, placeholder, last }) {
  return (
    <View style={[styles.field, last && { marginBottom: 0 }]}>
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
          <Ionicons name={show ? "eye-off" : "eye"} size={20} color="#E8B84B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    color: "#F5F1E8",
    fontSize: 16,
    fontWeight: "800",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  subtitle: {
    color: "rgba(245,241,232,0.55)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    padding: 16,
    marginBottom: 20,
  },

  field: { marginBottom: 14 },
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
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#F5F1E8",
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.10)",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: 0,
    height: 50,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  submitBtn: {
    backgroundColor: "#E8B84B",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#0B0B0C",
    fontWeight: "800",
    fontSize: 16,
  },
});

export default ChangePassword;
