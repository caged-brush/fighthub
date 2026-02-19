import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

import Profile from "./Profile";
import Settings from "./Settings";
import Upload from "./Upload";
import Message from "./Message";
import Home from "./Home";

const Tabs = createBottomTabNavigator();

export default function Dashboard() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: "#1f1f1f" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#888",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "ellipse";

          if (route.name === "Home")
            iconName = focused ? "home" : "home-outline";
          if (route.name === "Upload")
            iconName = focused ? "add-circle" : "add-circle-outline";
          if (route.name === "Inbox")
            iconName = focused ? "chatbubble" : "chatbubble-outline";
          if (route.name === "Profile")
            iconName = focused ? "person" : "person-outline";
          if (route.name === "Settings")
            iconName = focused ? "settings" : "settings-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Upload"
        component={Upload}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Inbox"
        component={Message}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Profile"
        component={Profile}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: false }}
      />
    </Tabs.Navigator>
  );
}
