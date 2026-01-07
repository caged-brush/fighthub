import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ScoutHome from "./ScoutHome";
import ScoutWatchlist from "./ScoutWatchlist";
import Ionicons from "@expo/vector-icons/Ionicons";
import ScoutProfile from "./ScoutProfile";

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#181818", borderTopColor: "#333" },
        tabBarActiveTintColor: "#ffd700",
        tabBarInactiveTintColor: "#888",

        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "ScoutHomeTab") {
            iconName = focused ? "home" : "home-outline";
          }

          if (route.name === "ScoutWatchlistTab") {
            iconName = focused ? "star" : "star-outline";
          }
          if (route.name === "ScoutProfile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="ScoutHomeTab"
        component={ScoutHome}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="ScoutWatchlistTab"
        component={ScoutWatchlist}
        options={{ title: "Watchlist" }}
      />

      <Tab.Screen
        name="ScoutProfile"
        component={ScoutProfile}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
