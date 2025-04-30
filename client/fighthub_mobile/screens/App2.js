import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import Profile from "./Profile";
import Settings from "./Settings"; // Import Settings page
import Ionicons from "@expo/vector-icons/Ionicons";
import Home from "./Home";
import Upload from "./Upload";
import VideoScreen from "./Video";
import Message from "./Message";
import UserListScreen from "./Message";
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
          } else if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Upload") {
            iconName = focused ? "add" : "add-outline";
          } else if (route.name === "Video") {
            iconName = focused ? "add" : "add-outline";
          } else if (route.name === "Inbox") {
            iconName = focused ? "chatbubble" : "chatbubble-outline";
          }

          // Return the Ionicons component with the determined name and color
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <myTabs.Screen
        name="Home"
        component={Home}
        options={{ headerShown: false }}
      />
      <myTabs.Screen
        name="Upload"
        component={Upload}
        options={{ headerShown: false }}
      />
      <myTabs.Screen
        name="Inbox"
        component={UserListScreen}
        options={{ headerShown: false }}
      />
      <myTabs.Screen
        name="Profile"
        component={Profile}
        options={{ headerShown: false }}
      />
      <myTabs.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: false }}
      />
    </myTabs.Navigator>
  );
}
