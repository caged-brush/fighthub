import { Pressable, Text } from "react-native";

export default function CustomButton({ children, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-red-600 rounded-lg p-3 flex justify-center items-center "
      style={style}
    >
      {children}
    </Pressable>
  );
}
