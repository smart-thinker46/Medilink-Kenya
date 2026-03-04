import React from "react";
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { MotiView } from "moti";
import {
  Crown,
  Users,
  Hospital,
  Stethoscope,
  Store,
  CreditCard,
  Settings,
  Sparkles,
  Bell,
  Mail,
  Video,
  Home,
  MessageCircle,
  ShieldAlert,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { useAuthStore } from "@/utils/auth/store";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import OnlineStatusChip from "@/components/OnlineStatusChip";
import { useToast } from "@/components/ToastProvider";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";

export default function AdminOverviewScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { t } = useI18n();
  const { auth } = useAuthStore();
  const firstName = getFirstName(auth?.user, "Admin");
  const timeGreeting = getTimeGreeting();
  const { isUserOnline } = useOnlineUsers();
  const { showToast } = useToast();
  const isOnline = isUserOnline(auth?.user);
  const isWide = screenWidth >= 1024;

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiClient.getAdminOverview(),
  });

  const overview = overviewQuery.data || {};
  const totals = overview.totals || {};
  const revenue = overview.revenue || {};
  const top = overview.top || {};

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "admin-overview"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });

  const aiUpdateMutation = useMutation({
    mutationFn: (enabled) => apiClient.aiUpdateSettings({ enabled }),
    onSuccess: () => {
      aiSettingsQuery.refetch();
      showToast("AI settings updated.", "success");
    },
    onError: (error) => {
      showToast(error.message || "Failed to update AI settings.", "error");
    },
  });

  const aiState = aiSettingsQuery.data || {};
  const aiEnabled = Boolean(aiState.aiEnabled);
  const aiProvider = String(aiState.provider || "gemini").toUpperCase();
  const aiBusy = aiSettingsQuery.isLoading || aiUpdateMutation.isLoading;
  const aiBlockedReason = aiState.blockedReason || "";

  const cards = [
    {
      id: "patients",
      title: "Patients",
      value: totals.patients || 0,
      icon: Users,
      color: theme.primary,
      route: "/(app)/(admin)/users?role=PATIENT",
    },
    {
      id: "medics",
      title: "Medics",
      value: totals.medics || 0,
      icon: Stethoscope,
      color: theme.accent,
      route: "/(app)/(admin)/users?role=MEDIC",
    },
    {
      id: "hospitals",
      title: "Hospitals",
      value: totals.hospitals || 0,
      icon: Hospital,
      color: theme.success,
      route: "/(app)/(admin)/users?role=HOSPITAL_ADMIN",
    },
    {
      id: "pharmacies",
      title: "Pharmacies",
      value: totals.pharmacies || 0,
      icon: Store,
      color: theme.warning,
      route: "/(app)/(admin)/users?role=PHARMACY_ADMIN",
    },
  ];
  const sidebarLinks = [
    { key: "dashboard", title: "Dashboard", href: "/(app)/(admin)", icon: Home },
    { key: "users", title: "Users", href: "/(app)/(admin)/users", icon: Users },
    { key: "subscriptions", title: "Subscriptions", href: "/(app)/(admin)/subscriptions", icon: CreditCard },
    { key: "control-center", title: "Control Center", href: "/(app)/(admin)/control-center", icon: ShieldAlert },
    { key: "complaints", title: "Complaints", href: "/(app)/(admin)/complaints", icon: ShieldAlert },
    { key: "audit", title: "Audit Logs", href: "/(app)/(admin)/audit-logs", icon: Settings },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(admin)/notifications", icon: Bell },
    { key: "email-center", title: "Email Center", href: "/(app)/(admin)/email-center", icon: Mail },
    { key: "video", title: "Video Call", href: "/(app)/(admin)/video-call", icon: Video },
    { key: "settings", title: "Settings", href: "/(app)/(admin)/settings", icon: Settings },
  ];

  return (
    <ScreenLayout>
      <View style={{ flex: 1, flexDirection: isWide ? "row" : "column" }}>
        {isWide && (
          <View
            style={{
              width: 240,
              paddingTop: insets.top + 20,
              paddingBottom: 24,
              paddingHorizontal: 16,
              borderRightWidth: 1,
              borderRightColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
                marginBottom: 16,
              }}
            >
              Admin Menu
            </Text>
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <TouchableOpacity
                  key={link.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 6,
                    backgroundColor: active ? theme.surface : "transparent",
                  }}
                  onPress={() => router.push(link.href)}
                  activeOpacity={0.8}
                >
                  <Icon color={active ? theme.primary : theme.iconColor} size={18} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.text,
                      marginLeft: 12,
                      flex: 1,
                    }}
                  >
                    {link.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Crown color={theme.primary} size={24} />
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                }}
              >
                {t("admin_dashboard")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/notifications")}
              >
                <Bell color={theme.iconColor} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/video-call")}
              >
                <Video color={theme.iconColor} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/settings")}
              >
                <Settings color={theme.iconColor} size={20} />
              </TouchableOpacity>
            </View>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              marginTop: 6,
            }}
          >
            {timeGreeting}, {firstName}. Monitor and control the entire Medilink ecosystem.
          </Text>
          <OnlineStatusChip isOnline={isOnline} theme={theme} style={{ marginTop: 10 }} />
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(admin)/control-center")}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldAlert color={theme.primary} size={18} />
              <Text
                style={{
                  marginLeft: 8,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Open Admin Control Center
              </Text>
            </View>
            <Text style={{ color: theme.primary, fontSize: 12 }}>Manage</Text>
          </TouchableOpacity>
          <View
            style={{
              backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                }}
              >
                Subscription Revenue
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                  marginTop: 4,
                }}
              >
                {revenue.currency || "KES"} {revenue.total || 0}
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${theme.primary}15`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CreditCard color={theme.primary} size={22} />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            User Counts
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            {cards.map((card, index) => (
              <MotiView
                key={card.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 500, delay: index * 100 }}
                style={{ width: "47%" }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => router.push(card.route)}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${card.color}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <card.icon color={card.color} size={20} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                    }}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: "Nunito_700Bold",
                      color: theme.text,
                      marginTop: 4,
                    }}
                  >
                    {card.value}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            AI Features
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 18,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Sparkles color={theme.primary} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    AI Status: {aiEnabled ? "Enabled" : "Disabled"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Provider: {aiProvider}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => aiUpdateMutation.mutate(!aiEnabled)}
                disabled={aiBusy}
                style={{
                  backgroundColor: aiEnabled ? theme.error : theme.primary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: aiBusy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                  {aiEnabled ? "Disable AI" : "Enable AI"}
                </Text>
              </TouchableOpacity>
            </View>
            {aiBlockedReason ? (
              <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                {aiBlockedReason}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(shared)/settings")}
              style={{
                marginTop: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 9,
                alignItems: "center",
                backgroundColor: theme.surface,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Open AI Settings
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Best Performing
          </Text>
          <View style={{ gap: 12 }}>
            {[{ label: "Hospitals", data: top.hospitals }, { label: "Medics", data: top.medics }, { label: "Pharmacies", data: top.pharmacies }].map(
              (section) => (
                <View
                  key={section.label}
                  style={{
                    backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      marginBottom: 8,
                    }}
                  >
                    {section.label}
                  </Text>
                  {(section.data || []).length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                      }}
                    >
                      No data yet.
                    </Text>
                  ) : (
                    (section.data || []).map((item) => (
                      <View
                        key={item.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: theme.text,
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.primary,
                          }}
                        >
                          {item.score}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              ),
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Admin Actions
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Complaints", route: "/(app)/(admin)/complaints" },
              { label: "Subscriptions", route: "/(app)/(admin)/subscriptions" },
              { label: "Audit Logs", route: "/(app)/(admin)/audit-logs" },
              { label: "All Users", route: "/(app)/(admin)/users" },
              { label: "Open Medic Dashboard", route: "/(app)/(medic)" },
              { label: "Open Pharmacy Dashboard", route: "/(app)/(pharmacy)" },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => router.push(item.route)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
