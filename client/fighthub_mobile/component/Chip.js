import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Chip({ label, value, style, labelStyle, valueStyle }) {
  if (!label) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Text
        style={[styles.value, valueStyle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value ?? "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexBasis: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 6,
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
});
