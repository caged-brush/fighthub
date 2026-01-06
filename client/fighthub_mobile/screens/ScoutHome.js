import React, { useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";

export default function ScoutHome({ navigation }) {
  const { logout, userId } = useContext(AuthContext);
  const handleLogout = () => {
    console.log("Logging out");
    logout();
  };
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "black",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 12,
        }}
      >
        Scout Home
      </Text>
      <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 24 }}>
        Placeholder. Build scouting features here.
      </Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("Dashboard")}
        style={{ padding: 14, backgroundColor: "#222", borderRadius: 10 }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Go to Fighter Dashboard (temp)
        </Text>
      </TouchableOpacity>
      <CustomButton style={{ width: "90%" }} onPress={handleLogout}>
        <Text style={{ fontWeight: "bold", color: "#fff" }}>Logout</Text>
      </CustomButton>
    </View>
  );
}
