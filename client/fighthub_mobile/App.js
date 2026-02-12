import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Signup from "./screens/Signup";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext, AuthProvider } from "./context/AuthContext"; // Use AuthProvider here
import Dashboard from "./screens/App2"; // Import Welcome
import { useContext } from "react";
import FighterOnboarding from "./screens/FighterOnboarding";
import ScoutOnboarding from "./screens/ScoutOnboarding";
import Login from "./screens/Login";
import Onboarding from "./screens/FighterOnboarding";
import Config from "react-native-config";
import Welcome from "./screens/Welcome";
import { useFonts } from "expo-font";
import ChatScreen from "./screens/ChatScreen";
import UserProfile from "./screens/UserProfile"; // Import UserProfile
import ScoutHome from "./screens/ScoutSearch";
import ScoutTabs from "./screens/ScoutTabs";
import ClipViewer from "./screens/ClipViewer";
import VerifyEmail from "./screens/VerifyScreen";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { supabase } from "./lib/supabase";

useEffect(() => {
  const sub = Linking.addEventListener("url", async ({ url }) => {
    // Supabase verification links come back here
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (!error) {
      // send them to a clear screen
      // navigation.navigate("EmailVerified");
    }
  });

  return () => sub.remove();
}, []);

function AppNavigator() {
  const { isLoading, userToken, isOnBoarded, userId, role } =
    useContext(AuthContext); // Access AuthContext here
  console.log("User Token:", userToken);
  console.log("User ID:", userId);
  console.log("Is OnBoarded:", isOnBoarded);

  const BottomTab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={"large"} />
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
            <Stack.Screen name="Signup" component={Signup} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen
              name="VerifyEmail"
              component={VerifyEmail}
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
          </>
        )}
        <Stack.Screen
          name="ClipViewer"
          component={ClipViewer}
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
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
