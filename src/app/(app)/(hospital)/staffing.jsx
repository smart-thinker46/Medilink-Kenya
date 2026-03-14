import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Briefcase, Users, Calendar, Plus } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";

export default function HospitalStaffingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const cards = [
    {
      title: "Manage Shifts",
      description: "Review, update, or cancel shifts you have created.",
      icon: Briefcase,
      onPress: () => router.push("/(app)/(hospital)/shifts"),
    },
    {
      title: "Create Shift",
      description: "Set up new doctor shifts and availability.",
      icon: Plus,
      onPress: () => router.push("/(app)/(hospital)/shift-create"),
    },
    {
      title: "Jobs",
      description: "Publish and manage long-term job opportunities.",
      icon: Users,
      onPress: () => router.push("/(app)/(hospital)/jobs"),
    },
    {
      title: "Post Job",
      description: "Create a new hiring opportunity for your facility.",
      icon: Plus,
      onPress: () => router.push("/(app)/(hospital)/job-create"),
    },
    {
      title: "Appointments",
      description: "Review patient requests and schedule staffing needs.",
      icon: Calendar,
      onPress: () => router.push("/(app)/(hospital)/appointments"),
    },
  ];

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          gap: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Staffing
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 6 }}>
            Manage shifts, jobs, and staffing workflows in one place.
          </Text>
        </View>

        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <TouchableOpacity
              key={card.title}
              onPress={card.onPress}
              activeOpacity={0.85}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Icon color={theme.primary} size={20} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  {card.title}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>{card.description}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ScreenLayout>
  );
}
