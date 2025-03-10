import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Profile from "./Profile";
import Settings from "./Settings"; // Import Settings page
import Ionicons from "@expo/vector-icons/Ionicons";
const myTabs = createBottomTabNavigator();

export default function Dashboard() {
  return (
    <myTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: "#1f1f1f" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#888",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          // Return the Ionicons component with the determined name and color
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
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
