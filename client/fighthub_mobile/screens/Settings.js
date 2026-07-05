import React, { useContext, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../Constants";

/**
 * Same design tokens as the rest of the app: near-black bg, warm bone-white
 * ink, gold accent. Settings is role-agnostic so it doesn't use the
 * red/gold/blue corner colors — just the neutral gold used for CTAs.
 */

const Settings = () => {
  const navigation = useNavigation();
  const { logout, userId, userToken, role } = useContext(AuthContext);

  const [profileUrl, setProfileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [availableToMatch, setAvailableToMatch] = useState(true);

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to update your profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      setProfileUrl(localUri);
      handleProfilePictureChange(localUri);
    }
  };

  const handleProfilePictureChange = async (localUri) => {
    if (!localUri || !userId) {
      Alert.alert("Error", "Missing image or user ID.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("profile_picture", {
        uri: localUri,
        name: "profile.jpg",
        type: "image/jpeg",
      });

      const res = await fetch(`${API_URL}/change-profile-pic`, {
        method: "PUT",
        body: formData,
        headers: {
          // Do not set Content-Type manually — RN sets the multipart
          // boundary itself when the body is FormData.
          Authorization: `Bearer ${userToken}`,
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || "Upload failed");
      }

      if (data?.users?.profile_picture_url) {
        setProfileUrl(`${API_URL}/${data.users.profile_picture_url}`);
      }
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "You'll need to log back in to continue.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently removes your profile, posts, and match history. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Not yet available",
              "Account deletion isn't wired up yet — contact support to close your account.",
            ),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Profile picture */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handleImagePick}
            activeOpacity={0.85}
            style={styles.avatarWrap}
          >
            {profileUrl ? (
              <Image source={{ uri: profileUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={32} color="#E8B84B" />
              </View>
            )}

            <View style={styles.avatarEditBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#0B0B0C" />
              ) : (
                <Ionicons name="camera" size={14} color="#0B0B0C" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Change profile picture</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <SectionLabel text="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="person-outline"
            label="Edit profile"
            onPress={() => navigation.navigate("EditProfile")}
          />
          <Divider />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Verification"
            trailing={<Text style={styles.mutedTag}>Not verified</Text>}
            onPress={() => navigation.navigate("Verification")}
          />
          <Divider />
          <SettingRow
            icon="lock-closed-outline"
            label="Change password"
            onPress={() => navigation.navigate("ChangePassword")}
            last
          />
        </View>

        {/* Preferences */}
        <SectionLabel text="Preferences" />
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            label="Push notifications"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          {role === "fighter" && (
            <>
              <Divider />
              <ToggleRow
                icon="flash-outline"
                label="Available for matches"
                value={availableToMatch}
                onValueChange={setAvailableToMatch}
              />
            </>
          )}
        </View>

        {/* Support */}
        <SectionLabel text="Support" />
        <View style={styles.card}>
          <SettingRow
            icon="help-circle-outline"
            label="Help center"
            onPress={() => navigation.navigate("Help")}
          />
          <Divider />
          <SettingRow
            icon="document-text-outline"
            label="Terms & conduct policy"
            onPress={() => navigation.navigate("Terms")}
          />
          <Divider />
          <SettingRow
            icon="mail-outline"
            label="Contact support"
            onPress={() => navigation.navigate("ContactSupport")}
            last
          />
        </View>

        {/* Session */}
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Log out"
            labelColor="#F5F1E8"
            onPress={confirmLogout}
            last
          />
        </View>

        {/* Danger zone */}
        <SectionLabel text="Danger zone" />
        <View style={[styles.card, styles.dangerCard]}>
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            labelColor="#D6473F"
            iconColor="#D6473F"
            onPress={confirmDeleteAccount}
            last
          />
        </View>

        <Text style={styles.footer}>Kavyx · v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({
  icon,
  label,
  labelColor,
  iconColor,
  trailing,
  onPress,
  last,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, last && { marginBottom: 0 }]}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={19}
          color={iconColor || "rgba(245,241,232,0.55)"}
        />
        <Text style={[styles.rowLabel, labelColor && { color: labelColor }]}>
          {label}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {trailing}
        <Ionicons
          name="chevron-forward"
          size={17}
          color="rgba(245,241,232,0.28)"
        />
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, label, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={19} color="rgba(245,241,232,0.55)" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(245,241,232,0.15)", true: "#E8B84B" }}
        thumbColor="#F5F1E8"
        ios_backgroundColor="rgba(245,241,232,0.15)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B0B0C" },
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },

  screenTitle: {
    color: "#F5F1E8",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 22,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 26,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    marginBottom: 12,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#1c1c1c",
    borderWidth: 2,
    borderColor: "rgba(232,184,75,0.55)",
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#1c1c1c",
    borderWidth: 2,
    borderColor: "rgba(232,184,75,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8B84B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B0B0C",
  },
  changePhotoText: {
    color: "#E8B84B",
    fontWeight: "700",
    fontSize: 14,
  },

  sectionLabel: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 6,
  },

  card: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,241,232,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  dangerCard: {
    borderColor: "rgba(214,71,63,0.25)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    color: "#F5F1E8",
    fontSize: 15,
    fontWeight: "600",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mutedTag: {
    color: "rgba(245,241,232,0.4)",
    fontSize: 12,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(245,241,232,0.07)",
  },

  footer: {
    textAlign: "center",
    color: "rgba(245,241,232,0.25)",
    fontSize: 12,
    marginTop: 8,
  },
});

export default Settings;
