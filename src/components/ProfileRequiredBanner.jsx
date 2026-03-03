import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/components/ThemeProvider";

export default function ProfileRequiredBanner({
  percent,
  message,
  onComplete,
  actionLabel = "Complete Profile",
}) {
  const { theme } = useAppTheme();
  const completionPercent = Number(percent || 0);

  if (completionPercent >= 100) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: `${theme.warning}15`,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: `${theme.warning}30`,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Inter_500Medium",
          color: theme.warning,
        }}
      >
        {message || `Profile completion is ${completionPercent}%.`}
      </Text>
      {onComplete && (
        <TouchableOpacity
          style={{
            marginTop: 8,
            alignSelf: "flex-start",
            backgroundColor: theme.primary,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
          onPress={onComplete}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
