import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

import Profile from "./Profile";
import Settings from "./Settings";
import Upload from "./Upload";

// ✅ Replace Home with your real feed screen
import FeedScreen from "./FeedScreen";

// ✅ Fix this import if you actually have a separate file
import UserListScreen from "./UserListScreen";

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

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Upload") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Inbox") {
            iconName = focused ? "chatbubble" : "chatbubble-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="Home"
        component={FeedScreen}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Upload"
        component={Upload}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Inbox"
        component={UserListScreen}
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
