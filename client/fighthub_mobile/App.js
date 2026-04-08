import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { useContext, useEffect } from "react";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";

import Signup from "./screens/Signup";
import Login from "./screens/Login";
import Welcome from "./screens/Welcome";

import Dashboard from "./screens/App2";
import FighterOnboarding from "./screens/FighterOnboarding";
import ScoutOnboarding from "./screens/ScoutOnboarding";

import ScoutTabs from "./screens/ScoutTabs";

import ChatScreen from "./screens/ChatScreen";
import UserProfile from "./screens/UserProfile";
import ClipViewer from "./screens/ClipViewer";
import FightOpportunityDetailsScreen from "./screens/FightOpportunityDetailsScreen";

import { supabase } from "./lib/supabase";
import CoachOnboardingScreen from "./screens/CoachOnboardingScreen";
import CoachSetupScreen from "./screens/CoachSetupScreen";
import CoachDashboard from "./screens/CoachDashboard";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoading, userToken, isOnBoarded, userId, role } =
    useContext(AuthContext);

  console.log("User Token:", userToken);
  console.log("User ID:", userId);
  console.log("Is OnBoarded:", isOnBoarded);
  console.log("Role:", role);

  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) {
        console.log("exchangeCodeForSession error:", error.message);
      }
    });

    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "black" },
          headerTitleStyle: {
            color: "white",
            fontWeight: "bold",
            fontSize: 20,
          },
          contentStyle: { backgroundColor: "black" },
        }}
      >
        {userToken === null ? (
          <>
            <Stack.Screen
              name="Welcome"
              component={Welcome}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="FighterOnboarding"
              component={FighterOnboarding}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ScoutOnboarding"
              component={ScoutOnboarding}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CoachOnboarding"
              component={CoachOnboardingScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : !isOnBoarded ? (
          role === "scout" ? (
            <Stack.Screen
              name="ScoutOnboarding"
              component={ScoutOnboarding}
              options={{ headerShown: false }}
            />
          ) : role === "coach" ? (
            <Stack.Screen
              name="CoachOnboarding"
              component={CoachOnboardingScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="FighterOnboarding"
              component={FighterOnboarding}
              options={{ headerShown: false }}
            />
          )
        ) : (
          <>
            {role === "scout" ? (
              <Stack.Screen
                name="ScoutTabs"
                component={ScoutTabs}
                options={{ headerShown: false }}
              />
            ) : role === "coach" ? (
              <Stack.Screen
                name="CoachDashboard"
                component={CoachDashboard}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={{ headerShown: false }}
              />
            )}

            <Stack.Screen
              name="ChatScreen"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.recipientName || "Chat",
                headerBackTitle: "Contacts",
                headerShown: true,
                headerStyle: { backgroundColor: "black" },
                headerTintColor: "white",
              })}
            />

            <Stack.Screen
              name="UserProfile"
              component={UserProfile}
              options={{
                headerBackTitleVisible: false,
                title: "",
                headerTransparent: true,
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: "transparent",
                  elevation: 0,
                  shadowOpacity: 0,
                },
              }}
            />

            <Stack.Screen
              name="FightOpportunityDetails"
              component={FightOpportunityDetailsScreen}
              options={{ headerShown: false }}
            />
          </>
        )}

        <Stack.Screen
          name="ClipViewer"
          component={ClipViewer}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CoachSetupScreen"
          component={CoachSetupScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "CustomFont-regular": require("./fonts/PlaywriteAUSA-Regular.ttf"),
    "CustomFont2-regular": require("./fonts/Jersey15-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
