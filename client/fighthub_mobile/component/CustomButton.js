import { Pressable, Text, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#e0245e", // Fighthub red
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e0245e",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
});

export default function CustomButton({ children, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, style]}>
      {typeof children === "string" ? (
        <Text style={styles.buttonText}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
