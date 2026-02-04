import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Stat({ label, value, style, labelStyle, valueStyle }) {
  if (value === undefined || value === null) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Text style={[styles.value, valueStyle]}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  value: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "950",
  },
});
