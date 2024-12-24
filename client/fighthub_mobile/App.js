import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Signup from "./screens/Signup";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext, AuthProvider } from "./context/AuthContext"; // Use AuthProvider here
import Welcome from "./screens/Welcome"; // Import Welcome
import { useContext } from "react";
import Login from "./screens/Login";
import Onboarding from "./screens/Onboarding";

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
          <Stack.Screen
            name="Welcome"
            component={Welcome}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
