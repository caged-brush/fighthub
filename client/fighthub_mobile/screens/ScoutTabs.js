import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ScoutHome from "./ScoutHome";
import ScoutWatchlist from "./ScoutWatchlist";

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#181818", borderTopColor: "#333" },
        tabBarActiveTintColor: "#ffd700",
        tabBarInactiveTintColor: "#888",
      }}
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
    </Tab.Navigator>
  );
}
