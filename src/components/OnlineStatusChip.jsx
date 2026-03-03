import React from "react";
import { View, Text } from "react-native";

export default function OnlineStatusChip({ isOnline, theme, style }) {
  const color = isOnline ? "#22C55E" : theme.textSecondary;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          backgroundColor: theme.surface,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 6,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          color,
        }}
      >
        {isOnline ? "Online" : "Offline"}
      </Text>
    </View>
  );
}
