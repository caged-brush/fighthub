import { Pressable, Text, StyleSheet } from "react-native";

export default function CustomButton({
  children,
  onPress,
  variant = "primary", // primary | outline | ghost
  disabled = false,
  style,
  textStyle,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.textBase,
          styles[`${variant}Text`],
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* Base */
  base: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Variants */
  primary: {
    backgroundColor: "#e0245e",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ffd700",
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  /* Pressed feedback */
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  /* Disabled */
  disabled: {
    opacity: 0.4,
  },

  /* Text */
  textBase: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  primaryText: {
    color: "#ffffff",
  },
  outlineText: {
    color: "#ffd700",
  },
  ghostText: {
    color: "rgba(255,255,255,0.9)",
  },
  disabledText: {
    color: "rgba(255,255,255,0.6)",
  },
});
