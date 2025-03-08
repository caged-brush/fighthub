import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Profile from "./Profile";
import Settings from "./Settings"; // Import Settings page

const myTabs = createBottomTabNavigator();

export default function Dashboard() {
  return (
    <myTabs.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#1f1f1f" }, // Customize tab bar color
        tabBarActiveTintColor: "#fff", // Active tab text color
        tabBarInactiveTintColor: "#888", // Inactive tab text color
      }}
    >
      <myTabs.Screen
        name="Profile"
        component={Profile}
        options={{ headerShown: false }} // Hide header for Profile
      />
      <myTabs.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: false }} // Hide header for Settings
      />
    </myTabs.Navigator>
  );
}
