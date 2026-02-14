import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import { apiGet } from "../lib/apiGet";


export default function ScoutProfile() {
  const [scoutData, setScoutData] = useState({
    scoutFName: "",
    scoutLName: "",
    scoutOrganization: "",
    scoutRegion: "",
  });

  const [loading, setLoading] = useState(true);

  const { userToken, logout } = useContext(AuthContext);

  const authHeaders = useMemo(() => {
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
  }, [userToken]);

  const fetchScoutProfile = useCallback(async () => {
    if (!userToken) {
      setScoutData({
        scoutFName: "",
        scoutLName: "",
        scoutOrganization: "",
        scoutRegion: "",
      });
      return;
    }

    setLoading(true);
    try {
      const s = await apiGet(`${API_URL}/scouts/me`, { token: userToken });

      setScoutData({
        scoutFName: s?.users?.fname ?? "",
        scoutLName: s?.users?.lname ?? "",
        scoutOrganization: s?.organization ?? "",
        scoutRegion: s?.region ?? "",
      });
    } catch (e) {
      console.error("fetchScoutProfile error:", e?.message || e);
      Alert.alert("Error", "Failed to load scout profile");
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchScoutProfile();
  }, [fetchScoutProfile]);

  const handleLogout = async () => {
    await logout();
  };

  const fullName =
    `${scoutData.scoutFName} ${scoutData.scoutLName}`.trim() || "Scout";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#181818" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.sub}>
            {scoutData.scoutOrganization || "No organization set"} •{" "}
            {scoutData.scoutRegion || "No region set"}
          </Text>
        </View>

        <TouchableOpacity onPress={fetchScoutProfile} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="#ffd700" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Organization</Text>
          <Text style={styles.value}>{scoutData.scoutOrganization || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Region</Text>
          <Text style={styles.value}>{scoutData.scoutRegion || "—"}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <CustomButton style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </CustomButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#181818", paddingTop: 58 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#bbb", marginTop: 10, fontWeight: "700" },

  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffd700",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sub: { color: "#aaa", marginTop: 2, fontWeight: "700" },

  refreshBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "#333",
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: "#232323",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: { color: "#ffd700", fontWeight: "900", marginBottom: 10 },

  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2f2f2f",
  },
  label: { color: "#bbb", fontWeight: "800" },
  value: { color: "#fff", marginTop: 6, fontWeight: "800" },

  logoutBtn: {
    backgroundColor: "#e0245e",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
