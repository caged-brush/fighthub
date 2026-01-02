import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../Constants";
import axios from "axios";

export default function RoleSelection({ navigation }) {
  const { userId, setRole } = useContext(AuthContext);

  const selectRole = async (role) => {
    try {
      await axios.put(`${API_URL}/users/role`, {
        userId,
        role,
      });

      setRole(role);

      if (role === "fighter") {
        navigation.replace("FighterOnboarding");
      } else {
        navigation.replace("ScoutOnboarding");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who are you?</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => selectRole("fighter")}
      >
        <Text style={styles.cardTitle}>🥊 Fighter</Text>
        <Text style={styles.cardText}>
          Showcase skills, get discovered, fight opportunities
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => selectRole("scout")}>
        <Text style={styles.cardTitle}>🎯 Scout</Text>
        <Text style={styles.cardText}>
          Discover talent, track fighters, book fights
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#ffd700",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#232323",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  cardTitle: {
    color: "#e0245e",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardText: {
    color: "#fff",
    fontSize: 15,
  },
});
