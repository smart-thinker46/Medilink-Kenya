import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Lock, Shield } from "lucide-react-native";

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

const DEFAULT_PRIVACY_SETTINGS = {
  showProfileToLinkedUsers: true,
  showOnlineStatus: true,
  shareApproximateLocation: true,
  allowSearchDiscovery: true,
  allowUsageAnalytics: true,
  allowAiDataProcessing: true,
  allowMarketingEmails: false,
};

const normalizeSettings = (value) => ({
  ...DEFAULT_PRIVACY_SETTINGS,
  ...(value && typeof value === "object" ? value : {}),
});

const PASSWORD_INTERVAL_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "365 days" },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const [settings, setSettings] = useState(DEFAULT_PRIVACY_SETTINGS);
  const [passwordIntervalDays, setPasswordIntervalDays] = useState(0);

  const profileQuery = useQuery({
    queryKey: ["profile", "privacy-settings"],
    queryFn: () => apiClient.getProfile(),
  });
  const profile = profileQuery.data?.user || profileQuery.data || {};
  const role = String(profile?.role || "").toUpperCase();

  useEffect(() => {
    if (!profileQuery.data) return;
    setSettings(normalizeSettings(profile?.privacySettings));
    const interval = Number(profile?.passwordUpdateIntervalDays || 0);
    setPasswordIntervalDays(Number.isFinite(interval) ? interval : 0);
  }, [profile?.privacySettings, profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.updateProfile({ privacySettings: payload }),
    onSuccess: () => {
      showToast("Privacy settings saved.", "success");
      profileQuery.refetch();
    },
    onError: (error) => {
      showToast(error?.message || "Failed to save privacy settings.", "error");
    },
  });

  const passwordPolicyMutation = useMutation({
    mutationFn: (intervalDays) => apiClient.updatePasswordPolicy(intervalDays),
    onSuccess: () => {
      showToast("Password update interval saved.", "success");
      profileQuery.refetch();
    },
    onError: (error) => {
      showToast(error?.message || "Failed to update password interval.", "error");
    },
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(ROLE_HOME_PATH[role] || "/(app)/(shared)/settings");
  };

  const requestDataExport = async () => {
    const subject = encodeURIComponent("MediLink Data Export Request");
    const body = encodeURIComponent(
      "Hello Support,\n\nI am requesting an export of my personal account data.\n\nRegards,\n",
    );
    const url = `mailto:support@medilink.africa?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast("Unable to open email app on this device.", "warning");
      return;
    }
    await Linking.openURL(url);
  };

  const requestDeletion = () => {
    Alert.alert(
      "Request Account Deletion",
      "For safety, deletion requests are reviewed by support. Continue to support options?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => router.push("/(app)/(shared)/support") },
      ],
    );
  };

  const rows = [
    {
      key: "showProfileToLinkedUsers",
      title: "Profile Visibility",
      description: "Allow linked users to view your profile details.",
    },
    {
      key: "showOnlineStatus",
      title: "Online Presence",
      description: "Show whether you are currently online in app.",
    },
    {
      key: "shareApproximateLocation",
      title: "Location Sharing",
      description: "Allow approximate location sharing for care matching and emergencies.",
    },
    {
      key: "allowSearchDiscovery",
      title: "Search Discovery",
      description: "Let your profile appear in in-app search results where relevant.",
    },
    {
      key: "allowUsageAnalytics",
      title: "Usage Analytics",
      description: "Allow anonymous analytics to improve app performance and quality.",
    },
    {
      key: "allowAiDataProcessing",
      title: "AI Processing",
      description: "Allow eligible data processing for AI summaries and smart search.",
    },
    {
      key: "allowMarketingEmails",
      title: "Marketing Messages",
      description: "Receive promotional offers and announcements by email.",
    },
  ];

  const daysRemaining = Number(profile?.passwordDaysRemaining);
  const passwordExpired = Boolean(profile?.passwordExpired);
  const expiryText = profile?.passwordExpiresAt
    ? new Date(profile.passwordExpiresAt).toLocaleString()
    : "No expiry set";
  const countdownColor = passwordExpired
    ? theme.error
    : Number.isFinite(daysRemaining)
      ? daysRemaining <= 9
        ? theme.error
        : daysRemaining <= 19
          ? theme.warning || "#f59e0b"
          : theme.success || "#10b981"
      : theme.textSecondary;

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
            Privacy & Security
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
            <Shield color={theme.primary} size={18} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              You control your privacy
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Manage visibility, processing consent, and account protection settings.
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
          title="Save Privacy Settings"
          onPress={() => saveMutation.mutate(settings)}
          loading={saveMutation.isLoading}
        />

        <View
          style={{
            marginTop: 12,
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 6,
            }}
          >
            Password Update Interval
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
            Choose how often your password should expire.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {PASSWORD_INTERVAL_OPTIONS.map((option) => {
              const active = Number(passwordIntervalDays) === Number(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPasswordIntervalDays(option.value)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    marginRight: 8,
                    marginBottom: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}20` : theme.surface,
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <Text style={{ fontSize: 12, color: countdownColor, fontFamily: "Inter_600SemiBold" }}>
              {passwordExpired
                ? "Password expired. Reset your password to continue."
                : Number.isFinite(daysRemaining)
                  ? `${daysRemaining} day(s) remaining`
                  : "No active countdown"}
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
              Expires at: {expiryText}
            </Text>
          </View>

          <Button
            title="Save Password Interval"
            onPress={() => passwordPolicyMutation.mutate(Number(passwordIntervalDays || 0))}
            loading={passwordPolicyMutation.isLoading}
            style={{ marginTop: 10 }}
          />
          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: theme.primary,
              }}
            >
              Update password now
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            marginTop: 12,
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Data Rights
          </Text>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
            onPress={requestDataExport}
          >
            <FileText color={theme.primary} size={16} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: theme.text,
              }}
            >
              Request Personal Data Export
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center" }}
            onPress={requestDeletion}
          >
            <Lock color={theme.error} size={16} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: theme.error,
              }}
            >
              Request Account Deletion
            </Text>
          </TouchableOpacity>
        </View>

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
          onPress={() => router.push("/(app)/(shared)/policies")}
          activeOpacity={0.85}
        >
          <FileText color={theme.primary} size={16} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
            }}
          >
            View Full Policies & Terms
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
