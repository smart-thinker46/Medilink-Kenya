import React from "react";
import { View, Text } from "react-native";
import { MapPin } from "lucide-react-native";

import Input from "@/components/Input";
import { useAppTheme } from "@/components/ThemeProvider";

export default function LocationPickerField({
  address,
  lat,
  lng,
  title = "Location",
}) {
  const { theme, isDark } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <MapPin color={theme.primary} size={18} />
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginLeft: 8,
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: 12,
            fontFamily: "Inter_500Medium",
            lineHeight: 18,
          }}
        >
          Location can only be set from the mobile app. Please use your phone to
          pick location on map or search location.
        </Text>
      </View>

      <Input label="Location Address" value={address || ""} editable={false} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Input
          label="Latitude"
          value={lat || ""}
          editable={false}
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="Longitude"
          value={lng || ""}
          editable={false}
          containerStyle={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
