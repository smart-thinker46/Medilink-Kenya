import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Shield } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const ROLE_HOME_PATH = {
  PATIENT: "/(app)/(patient)",
  MEDIC: "/(app)/(medic)",
  HOSPITAL_ADMIN: "/(app)/(hospital)",
  PHARMACY_ADMIN: "/(app)/(pharmacy)",
  SUPER_ADMIN: "/(app)/(admin)",
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  appointmentReminders: true,
  chatMessages: true,
  paymentUpdates: true,
  emergencyAlerts: true,
  promotions: false,
  weeklyDigest: true,
};

const normalizeSettings = (value) => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  ...(value && typeof value === "object" ? value : {}),
});

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();

  const profileQuery = useQuery({
    queryKey: ["profile", "notification-settings"],
    queryFn: () => apiClient.getProfile(),
  });
  const profile = profileQuery.data?.user || profileQuery.data || {};
  const role = String(profile?.role || "").toUpperCase();
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    if (!profileQuery.data) return;
    setSettings(normalizeSettings(profile?.notificationSettings));
  }, [profile?.notificationSettings, profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.updateProfile({ notificationSettings: payload }),
    onSuccess: () => {
      showToast("Notification settings saved.", "success");
      profileQuery.refetch();
    },
    onError: (error) => {
      showToast(error?.message || "Failed to save notification settings.", "error");
    },
  });

  const rows = useMemo(
    () => [
      {
        key: "pushEnabled",
        title: "Push Notifications",
        description: "Receive alerts directly on your device.",
      },
      {
        key: "emailEnabled",
        title: "Email Notifications",
        description: "Get updates in your email inbox.",
      },
      {
        key: "smsEnabled",
        title: "SMS Notifications",
        description: "Get high-priority updates by SMS.",
      },
      {
        key: "appointmentReminders",
        title: "Appointment Reminders",
        description: "Upcoming visit and booking reminders.",
      },
      {
        key: "chatMessages",
        title: "Chat Messages",
        description: "New message alerts from users and medics.",
      },
      {
        key: "paymentUpdates",
        title: "Payment Updates",
        description: "Subscription and checkout transaction updates.",
      },
      {
        key: "emergencyAlerts",
        title: "Emergency Alerts",
        description: "Urgent emergency and safety notifications.",
      },
      {
        key: "promotions",
        title: "Promotions",
        description: "Discounts, offers, and campaign messages.",
      },
      {
        key: "weeklyDigest",
        title: "Weekly Digest",
        description: "Summary of your weekly activity in the app.",
      },
    ],
    [],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(ROLE_HOME_PATH[role] || "/(app)/(shared)/settings");
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Notification Settings
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Bell color={theme.primary} size={18} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              Control your alerts
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Choose how and when MediLink sends important updates to you.
          </Text>
        </View>

        {rows.map((row) => (
          <View
            key={row.key}
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                {row.title}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: theme.textSecondary }}>
                {row.description}
              </Text>
            </View>
            <Switch
              value={Boolean(settings[row.key])}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, [row.key]: Boolean(value) }))
              }
              thumbColor={settings[row.key] ? theme.primary : theme.border}
              trackColor={{ true: `${theme.primary}55`, false: theme.border }}
            />
          </View>
        ))}

        <Button
          title="Save Notification Settings"
          onPress={() => saveMutation.mutate(settings)}
          loading={saveMutation.isLoading}
        />

        <TouchableOpacity
          style={{
            marginTop: 12,
            backgroundColor: theme.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => router.push("/(app)/(shared)/privacy-settings")}
          activeOpacity={0.85}
        >
          <Shield color={theme.primary} size={16} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
            }}
          >
            Open Privacy Settings
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
