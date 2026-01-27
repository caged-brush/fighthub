import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

import FeedScreen from "./FeedScreen"; // ✅ new feed
import ScoutSearch from "./ScoutSearch"; // ✅ your current filter/search screen (rename later)
import ScoutWatchlist from "./ScoutWatchlist";
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
          let iconName = "ellipse";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Search") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "Watchlist") {
            iconName = focused ? "star" : "star-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* ✅ HOME = FEED */}
      <Tab.Screen name="Home" component={FeedScreen} />

      {/* ✅ SEARCH = your current ScoutHome screen */}
      <Tab.Screen name="Search" component={ScoutSearch} />

      <Tab.Screen name="Watchlist" component={ScoutWatchlist} />
      <Tab.Screen name="Profile" component={ScoutProfile} />
    </Tab.Navigator>
  );
}
