import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScoutFightManagerTabs from "./ScoutFightManagerTabs";
import FightOpportunityDetailsScreen from "../screens/FightOpportunityDetailsScreen";

const Stack = createNativeStackNavigator();

export default function ScoutStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "black" },
        headerTintColor: "white",
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen
        name="ScoutFightManager"
        component={ScoutFightManagerTabs}
        options={{ title: "Fight Management" }}
      />
      <Stack.Screen
        name="FightOpportunityDetails"
        component={FightOpportunityDetailsScreen}
        options={{ title: "Fight Details" }}
      />
    </Stack.Navigator>
  );
}
