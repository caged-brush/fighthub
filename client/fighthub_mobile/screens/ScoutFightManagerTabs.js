import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";

import ScoutPublishedFightsScreen from "../screens/ScoutPublishedFightsScreen";
import ScoutApplicantsScreen from "../screens/ScoutApplicantsScreen";
import ScoutCreateFightPostScreen from "../screens/ScoutCreateFightPostScreen";

const Tab = createMaterialTopTabNavigator();

export default function ScoutFightManagerTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }} edges={["top"]}>
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarStyle: {
            backgroundColor: "black",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: "#1f1f1f",
          },
          tabBarIndicatorStyle: {
            backgroundColor: "white",
            height: 3,
            borderRadius: 999,
          },
          tabBarLabelStyle: {
            color: "white",
            fontWeight: "700",
            textTransform: "none",
            fontSize: 14,
          },
          tabBarItemStyle: {
            width: "auto",
          },
          tabBarPressColor: "transparent",
          sceneStyle: {
            backgroundColor: "black",
          },
        }}
      >
        <Tab.Screen
          name="Published"
          component={ScoutPublishedFightsScreen}
          options={{ title: "Published" }}
        />
        <Tab.Screen
          name="Applicants"
          component={ScoutApplicantsScreen}
          options={{ title: "Applicants" }}
        />
        <Tab.Screen
          name="CreatePost"
          component={ScoutCreateFightPostScreen}
          options={{ title: "Create Post" }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
