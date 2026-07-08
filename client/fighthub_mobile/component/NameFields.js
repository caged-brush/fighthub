import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function NameFields({ fname, lname, setFname, setLname }) {
  return (
    <View>
      <Text style={styles.label}>First name *</Text>
      <TextInput
        style={styles.input}
        value={fname}
        onChangeText={setFname}
        placeholder="First name"
        placeholderTextColor="#777"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={styles.label}>Last name *</Text>
      <TextInput
        style={styles.input}
        value={lname}
        onChangeText={setLname}
        placeholder="Last name"
        placeholderTextColor="#777"
        autoCapitalize="words"
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#ffd700",
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#e0245e",
  },
});
