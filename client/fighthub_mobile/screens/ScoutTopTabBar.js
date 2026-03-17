import React from "react";
import { View, TouchableOpacity, Text, ScrollView } from "react-native";

export default function ScoutTopTabBar({ state, descriptors, navigation }) {
  return (
    <View style={{ backgroundColor: "black", paddingVertical: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isFocused ? "white" : "#444",
                backgroundColor: isFocused ? "white" : "transparent",
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  color: isFocused ? "black" : "white",
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
