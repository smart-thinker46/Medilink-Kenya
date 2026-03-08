import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useMutation, useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import { useI18n } from "@/utils/i18n";
import apiClient from "@/utils/api";

export default function SharedSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme,
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    currency,
    setCurrency,
    batterySaver,
    setBatterySaver,
    refreshInterval,
    setRefreshInterval,
  } = useAppTheme();
  const { t } = useI18n();
  const { logout, auth } = useAuthStore();

  const role = auth?.user?.role?.toUpperCase?.() || auth?.user?.role;
  const profileRoutes = {
    PATIENT: "/(app)/(patient)/edit-profile",
    MEDIC: "/(app)/(medic)/edit-profile",
    HOSPITAL_ADMIN: "/(app)/(hospital)/edit-profile",
    PHARMACY_ADMIN: "/(app)/(pharmacy)/edit-profile",
  };
  const profileRoute = profileRoutes[role];

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const options = [
    { id: "auto", label: t("system"), icon: Monitor },
    { id: "light", label: t("light"), icon: Sun },
    { id: "dark", label: t("dark"), icon: Moon },
  ];

  const languageOptions = [
    { id: "en", label: t("english") },
    { id: "sw", label: t("swahili") },
  ];

  const currencyOptions = [
    { id: "KES", label: "KES" },
    { id: "USD", label: "USD" },
  ];

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });
  const aiUpdateMutation = useMutation({
    mutationFn: (enabled) => apiClient.aiUpdateSettings({ enabled }),
    onSuccess: () => aiSettingsQuery.refetch(),
  });

  const aiState = aiSettingsQuery.data || {};
  const isPremium = Boolean(aiState.isPremium);
  const aiEnabled = Boolean(aiState.aiEnabled);
  const aiProviderLabel = String(aiState.displayProvider || "Medilink AI");
  const aiBusy = aiSettingsQuery.isLoading || aiUpdateMutation.isLoading;

  const handleToggleAi = (nextValue) => {
    if (nextValue && !isPremium) {
      Alert.alert(
        "Premium Required",
        "AI is a premium feature. Activate subscription to enable AI.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Subscribe",
            onPress: () =>
              router.push({
                pathname: "/(app)/(shared)/subscription-checkout",
                params: { role },
              }),
          },
        ],
      );
      return;
    }
    aiUpdateMutation.mutate(nextValue);
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.back()}
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
            {t("settings")}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          {t("appearance")}
        </Text>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = themeMode === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setThemeMode(option.id)}
                activeOpacity={0.8}
              >
                <Icon color={isActive ? theme.primary : theme.textSecondary} size={18} />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {profileRoute && (
          <>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.textSecondary,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
          {t("account")}
        </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 24,
              }}
              onPress={() => router.push(profileRoute)}
            >
              <User color={theme.primary} size={18} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                {t("edit_profile")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 24,
              }}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Lock color={theme.primary} size={18} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                Reset Password
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          {t("language")}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {languageOptions.map((option) => {
            const isActive = language === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setLanguage(option.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          {t("currency")}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {currencyOptions.map((option) => {
            const isActive = currency === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setCurrency(option.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Battery Saver
        </Text>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Disable Live Updates
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              Saves battery by pausing map refresh.
            </Text>
          </View>
          <Switch
            value={batterySaver}
            onValueChange={setBatterySaver}
            thumbColor={batterySaver ? theme.primary : theme.border}
            trackColor={{ true: `${theme.primary}66`, false: theme.border }}
          />
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Refresh Interval
        </Text>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 24,
          }}
        >
          <Picker
            selectedValue={refreshInterval}
            onValueChange={(value) => setRefreshInterval(value)}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
          >
            <Picker.Item label="Every 15 seconds" value={15000} />
            <Picker.Item label="Every 30 seconds" value={30000} />
            <Picker.Item label="Every 60 seconds" value={60000} />
          </Picker>
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Safety & Legal
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 10,
          }}
          onPress={() => router.push("/(app)/(shared)/notifications-settings")}
        >
          <Bell color={theme.primary} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            Notification Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 10,
          }}
          onPress={() => router.push("/(app)/(shared)/privacy-settings")}
        >
          <Shield color={theme.primary} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            Privacy Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 10,
          }}
          onPress={() => router.push("/(app)/(shared)/support")}
        >
          <HelpCircle color={theme.primary} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            Help & Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 24,
          }}
          onPress={() => router.push("/(app)/(shared)/policies")}
        >
          <FileText color={theme.primary} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            Policies & Terms
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          AI Premium
        </Text>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Enable AI Assistant
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                {aiProviderLabel} • {isPremium ? "Premium active" : "Premium inactive"}
              </Text>
              {!isPremium && (
                <Text style={{ fontSize: 12, color: theme.warning, marginTop: 4 }}>
                  Subscribe to unlock AI search and health summaries.
                </Text>
              )}
              {!!aiState?.blockedReason && (
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  {aiState.blockedReason}
                </Text>
              )}
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={handleToggleAi}
              disabled={aiBusy}
              thumbColor={aiEnabled ? theme.primary : theme.border}
              trackColor={{ true: `${theme.primary}66`, false: theme.border }}
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          {t("account")}
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={handleLogout}
        >
          <LogOut color={theme.error} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.error,
              marginLeft: 8,
            }}
          >
            {t("logout")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
