import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

import FeedScreen from "./FeedScreen";
import ScoutSearch from "./ScoutSearch";
import ScoutWatchlist from "./ScoutWatchlist";
import ScoutProfile from "./ScoutProfile";
import ScoutStack from "./ScoutStack";

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
          } else if (route.name === "Fights") {
            iconName = focused ? "fitness" : "fitness-outline";
          } else if (route.name === "Watchlist") {
            iconName = focused ? "star" : "star-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={FeedScreen} />
      <Tab.Screen name="Search" component={ScoutSearch} />
      <Tab.Screen name="Fights" component={ScoutStack} />
      <Tab.Screen name="Watchlist" component={ScoutWatchlist} />
      <Tab.Screen name="Profile" component={ScoutProfile} />
    </Tab.Navigator>
  );
}
