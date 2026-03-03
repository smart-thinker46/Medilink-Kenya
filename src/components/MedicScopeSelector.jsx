import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/components/ThemeProvider";

export default function MedicScopeSelector({
  visible = false,
  medics = [],
  selectedMedicId = null,
  onSelect,
  loading = false,
  style,
}) {
  const { theme } = useAppTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        {
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.card,
          padding: 10,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
        Admin scope: choose a medic workspace
      </Text>
      {loading ? (
        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
          Loading medics...
        </Text>
      ) : medics.length === 0 ? (
        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
          No medic accounts available.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {medics.map((medic) => {
            const active = medic?.id === selectedMedicId;
            const label =
              medic?.name ||
              `${medic?.firstName || ""} ${medic?.lastName || ""}`.trim() ||
              "Medic";
            return (
              <TouchableOpacity
                key={medic?.id}
                onPress={() => onSelect?.(medic?.id)}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}22` : theme.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: active ? theme.primary : theme.text,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

