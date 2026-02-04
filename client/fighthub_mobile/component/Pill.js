import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Pill({
  text,
  tone = "muted", // "muted" | "good" | "bad"
  style,
  textStyle,
}) {
  if (!text) return null;

  const toneStyle =
    tone === "good"
      ? styles.pillGood
      : tone === "bad"
        ? styles.pillBad
        : styles.pillMuted;

  const toneTextStyle =
    tone === "good"
      ? styles.textDark
      : tone === "bad"
        ? styles.textLight
        : styles.textMuted;

  return (
    <View style={[styles.pill, toneStyle, style]}>
      <Text style={[styles.text, toneTextStyle, textStyle]} numberOfLines={1}>
        {String(text)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  pillMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillGood: {
    backgroundColor: "#ffd700",
  },
  pillBad: {
    backgroundColor: "#e0245e",
  },

  text: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  textMuted: {
    color: "rgba(255,255,255,0.75)",
  },
  textDark: {
    color: "#0b0b0b",
  },
  textLight: {
    color: "#ffffff",
  },
});
