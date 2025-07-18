import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Signup from "./screens/Signup";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext, AuthProvider } from "./context/AuthContext"; // Use AuthProvider here
import Dashboard from "./screens/App2"; // Import Welcome
import { useContext } from "react";
import Login from "./screens/Login";
import Onboarding from "./screens/Onboarding";
import Config from "react-native-config";
import Welcome from "./screens/Welcome";
import { useFonts } from "expo-font";
import ChatScreen from "./screens/ChatScreen";
import UserProfile from "./screens/UserProfile"; // Import UserProfile

function AppNavigator() {
  const { isLoading, userToken, isOnBoarded, userId } = useContext(AuthContext); // Access AuthContext here
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
            <Stack.Screen name="Sign up" component={Signup} />
            <Stack.Screen name="Login" component={Login} />
          </>
        ) : !isOnBoarded ? (
          <Stack.Screen
            name="Onboarding"
            component={Onboarding}
            initialParams={{ userId }}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Dashboard"
              component={Dashboard}
              options={{ headerShown: false }}
            />
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
                headerBackTitleVisible: false, // hides the "Back" text
                title: "", // removes title
                headerTransparent: true, // optional: makes header see-through if needed
                headerShadowVisible: false, // removes bottom shadow (RN >= 0.70+)
                headerStyle: {
                  backgroundColor: "transparent", // or set your own background color
                  elevation: 0, // Android
                  shadowOpacity: 0, // iOS
                },
              }}
            />
          </>
        )}
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
