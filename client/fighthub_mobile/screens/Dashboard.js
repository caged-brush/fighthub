import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { logout, userId } = useContext(AuthContext);
  const handleLogout = () => {
    console.log("Logging out");

    logout();
  };
  return (
    <View className="flex justify-center items-center mt-10">
      <Pressable onPress={handleLogout}>
        <Text className="text-white">Logout</Text>
      </Pressable>
      <Text className="text-white">userId: {userId}</Text>
    </View>
  );
}
