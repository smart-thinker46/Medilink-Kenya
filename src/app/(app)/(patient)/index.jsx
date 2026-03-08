import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import {
  Search,
  Home,
  Calendar,
  FileText,
  Heart,
  Clock,
  Bell,
  Settings,
  Video,
  MessageCircle,
  Crown,
  Sparkles,
  Mic,
  User,
} from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import { useNotifications } from "@/utils/useNotifications";
import { useI18n } from "@/utils/i18n";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";

export default function PatientHomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { t } = useI18n();
  const { auth } = useAuthStore();
  const { profile } = usePatientProfile();
  const { unreadCount } = useNotifications();
  const firstName = getFirstName(auth?.user, "Patient");
  const timeGreeting = getTimeGreeting();
  const isWideWeb = Platform.OS === "web" && screenWidth >= 1024;

  const completion = useMemo(
    () => getProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;
  const recoveryStatus =
    String(profile?.recoveryStatus || "").toUpperCase() === "RECOVERED"
      ? "RECOVERED"
      : "UNDER_TREATMENT";
  const rawHealthScore = Number(profile?.healthScore);
  const healthScore =
    recoveryStatus === "RECOVERED"
      ? 100
      : Number.isFinite(rawHealthScore)
        ? Math.max(0, Math.min(100, rawHealthScore))
        : 87;

  const medicsQuery = useQuery({
    queryKey: ["medics", "featured"],
    queryFn: () => apiClient.getMedics({ limit: 3 }),
  });
  const featuredMedics =
    medicsQuery.data?.items || medicsQuery.data || [];

  const recordsQuery = useQuery({
    queryKey: ["patient-records", "home"],
    queryFn: () => apiClient.getMedicalRecords(),
  });
  const records = recordsQuery.data?.items || recordsQuery.data || [];

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "patient-home"],
    queryFn: () => apiClient.getAppointments(),
  });
  const appointments = appointmentsQuery.data?.items || appointmentsQuery.data || [];
  const medicsList = medicsQuery.data?.items || medicsQuery.data || [];
  const medicsMap = medicsList.reduce((acc, medic) => {
    acc[medic.id || medic.medicId] = medic;
    return acc;
  }, {});

  const upcomingAppointments = appointments.slice(0, 3).map((appointment) => {
    const medic =
      medicsMap[appointment.medicId || appointment.medic_id] || {};
    return {
      id: appointment.id,
      medicId: appointment.medicId || appointment.medic_id,
      doctorName:
        medic.name ||
        `${medic.firstName || ""} ${medic.lastName || ""}`.trim() ||
        "Medic",
      specialization: medic.specialization || "General Practice",
      date: appointment.date || "Scheduled",
      time: appointment.time || "",
      type: appointment.mode || "Consultation",
    };
  });
  const linkedMedicId = upcomingAppointments[0]?.medicId || "";

  const handleProtectedAction = (action) => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Your Profile",
        "Please complete at least 99% of your profile before booking appointments.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(patient)/edit-profile"),
          },
        ],
      );
      return;
    }
    action();
  };

  const quickActions = [
    {
      id: "search-medics",
      title: "Find Medics",
      description: "Search specialists",
      icon: Search,
      color: theme.primary,
      onPress: () => router.push("/(app)/(patient)/search-medics"),
    },
    {
      id: "ai-finder",
      title: "AI Finder",
      description: "Find medicines, pharmacies, medics",
      icon: Sparkles,
      color: theme.info,
      onPress: () => router.push("/(app)/(shared)/ai-finder"),
    },
    {
      id: "book-appointment",
      title: t("book_appointment"),
      description: t("book_appointment_desc"),
      icon: Calendar,
      color: theme.accent,
      onPress: () =>
        handleProtectedAction(() =>
          router.push("/(app)/(patient)/book-appointment"),
        ),
      locked: !isProfileComplete,
    },
    {
      id: "medical-records",
      title: t("medical_records"),
      description: t("medical_records_desc"),
      icon: FileText,
      color: theme.success,
      onPress: () => router.push("/(app)/(patient)/medical-history"),
    },
    {
      id: "ai-assistant",
      title: "AI Assistant",
      description: "Smart search and health summary",
      icon: Sparkles,
      color: theme.info,
      onPress: () => router.push("/(app)/(patient)/ai-assistant"),
    },
    {
      id: "health-hub",
      title: "Health Hub",
      description: "Care plan, vitals, alerts",
      icon: Heart,
      color: theme.primary,
      onPress: () => router.push("/(app)/(patient)/health-hub"),
    },
    {
      id: "voice-ai",
      title: "Voice Assistant",
      description: "Medilink AI voice tools",
      icon: Mic,
      color: theme.warning,
      onPress: () => router.push("/(app)/(patient)/ai-voice"),
    },
    {
      id: "emergency",
      title: t("emergency"),
      description: t("emergency_desc"),
      icon: Heart,
      color: theme.error,
      onPress: () => router.push("/(app)/(patient)/emergency"),
    },
  ];

  const latestRecords = records.slice(0, 3);
  const sidebarLinks = [
    { key: "dashboard", title: "Dashboard", href: "/(app)/(patient)", icon: Home },
    { key: "appointments", title: "Appointments", href: "/(app)/(patient)/appointments", icon: Calendar },
    { key: "book", title: "Book Appointment", href: "/(app)/(patient)/book-appointment", icon: Calendar },
    { key: "find-medics", title: "Find Medics", href: "/(app)/(patient)/search-medics", icon: Search },
    { key: "ai-finder", title: "AI Finder", href: "/(app)/(shared)/ai-finder", icon: Sparkles },
    { key: "records", title: "Medical Records", href: "/(app)/(patient)/medical-history", icon: FileText },
    { key: "health-hub", title: "Health Hub", href: "/(app)/(patient)/health-hub", icon: Heart },
    { key: "voice-ai", title: "Voice Assistant", href: "/(app)/(patient)/ai-voice", icon: Mic },
    { key: "emergency", title: "Emergency", href: "/(app)/(patient)/emergency", icon: Heart },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "video", title: "Video Call", href: "/(app)/(patient)/video-call", icon: Video },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "profile", title: "Profile", href: "/(app)/(patient)/profile", icon: User },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(patient)/edit-profile", icon: Settings },
  ];

  return (
    <ScreenLayout>
      <View style={{ flex: 1, flexDirection: isWideWeb ? "row" : "column" }}>
        {isWideWeb && (
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
              Patient Menu
            </Text>
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              const showBadge = link.key === "notifications" && unreadCount > 0;
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
                  {showBadge && (
                    <View
                      style={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: theme.error,
                        paddingHorizontal: 6,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter_700Bold",
                          color: "#FFFFFF",
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
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
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginBottom: 4,
              }}
            >
              {timeGreeting}
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
              }}
            >
              {firstName}
            </Text>
            <View style={{ marginTop: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                  }}
                >
                  Health
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: recoveryStatus === "RECOVERED" ? theme.success : theme.warning,
                  }}
                >
                  {Math.max(0, Math.min(100, healthScore))}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, healthScore))}%`,
                    backgroundColor: theme.success,
                  }}
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => router.push("/(app)/(shared)/notifications")}
            >
              <Bell color={theme.iconColor} size={20} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    backgroundColor: theme.error,
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              )}
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
              onPress={() => router.push("/(app)/(shared)/settings")}
            >
              <Settings color={theme.iconColor} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Status Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 600 }}
          style={{ paddingHorizontal: 24, marginBottom: 32 }}
        >
          <LinearGradient
            colors={theme.gradient.primary}
            style={{
              borderRadius: 20,
              padding: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Nunito_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Your Health Status
              </Text>

              <Heart color="#FFFFFF" size={24} />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 32,
                    fontFamily: "Nunito_700Bold",
                    color: "#FFFFFF",
                  }}
                >
                  {Math.max(0, Math.min(100, healthScore))}%
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {recoveryStatus === "RECOVERED" ? "Recovered" : "Health Score"}
                </Text>
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  Next Checkup
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  2 weeks away
                </Text>
              </View>
            </View>
          </LinearGradient>
        </MotiView>

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(patient)/health-hub")}
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Heart color={theme.primary} size={22} />
                </View>
                <View>
                  <Text style={{ color: theme.text, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>
                    Health Hub
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    Care plan, vitals, labs, reminders, alerts
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Open
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Completion */}
        {completion.percent < 100 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 600 }}
              style={{
                backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  Profile Completion
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_700Bold",
                    color: isProfileComplete ? theme.success : theme.warning,
                  }}
                >
                  {completion.percent}%
                </Text>
              </View>

              <View
                style={{
                  height: 10,
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${completion.percent}%`,
                    backgroundColor: isProfileComplete
                      ? theme.success
                      : theme.warning,
                  }}
                />
              </View>

              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 8,
                }}
              >
                Complete your profile to book appointments:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {completion.missingFields.slice(0, 6).map((field) => (
                  <View
                    key={field}
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                        color: theme.textSecondary,
                      }}
                    >
                      {field}
                    </Text>
                  </View>
                ))}
                {completion.missingFields.length > 6 && (
                  <View
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                        color: theme.textSecondary,
                      }}
                    >
                      +{completion.missingFields.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(patient)/edit-profile")}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Complete Profile
                </Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 16,
            }}
          >
            {t("quick_actions")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            {quickActions.map((action, index) => (
              <MotiView
                key={action.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: 600,
                  delay: 100 + index * 100,
                }}
                style={{
                  flexBasis: "48%",
                  flexGrow: 1,
                  maxWidth: 320,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                    opacity: action.locked ? 0.6 : 1,
                  }}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: `${action.color}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <action.icon color={action.color} size={24} />
                  </View>

                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      marginBottom: 4,
                    }}
                  >
                    {action.title}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                      lineHeight: 16,
                    }}
                  >
                    {action.description}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 16,
            }}
          >
            Location
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/(app)/(shared)/location")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                Set My Location
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Save approximate location
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: linkedMedicId ? theme.card : theme.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: linkedMedicId ? 1 : 0.6,
              }}
              disabled={!linkedMedicId}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/location",
                  params: { targetId: linkedMedicId, title: "Medic Location" },
                })
              }
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                View Medic Location
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                From your next appointment
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 12 }}>
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
              onPress={() => router.push("/(app)/(shared)/nearby-map")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                Nearby Medics & Users
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                See nearby medics and linked users on a map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Medics */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Nunito_600SemiBold",
                color: theme.text,
              }}
            >
              Find Medics
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/(patient)/search-medics")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: theme.primary,
                }}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {featuredMedics.length === 0 ? (
            <View
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
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                {medicsQuery.isLoading
                  ? "Loading medics..."
                  : "No medics available yet."}
              </Text>
            </View>
          ) : (
            featuredMedics.map((medic) => (
              <View
                key={medic.id || medic.medicId || medic.name}
                style={{
                  backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: theme.surface,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "Inter_700Bold",
                        color: theme.primary,
                      }}
                    >
                      {medic.firstName?.[0] || medic.name?.[0] || "M"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {medic.name ||
                        `${medic.firstName || ""} ${medic.lastName || ""}`.trim()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                      }}
                    >
                      {medic.specialization || "General Practice"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.surface,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={() =>
                        router.push(
                          `/(app)/(patient)/chat?medicId=${medic.id || ""}`,
                        )
                      }
                    >
                      <MessageCircle color={theme.iconColor} size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.surface,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={() =>
                        router.push(
                          `/(app)/(patient)/video-call?medicId=${medic.id || ""}`,
                        )
                      }
                    >
                      <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Video color={theme.iconColor} size={16} />
                        <Crown color={theme.warning} size={10} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: isProfileComplete
                      ? theme.primary
                      : theme.surface,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    borderWidth: isProfileComplete ? 0 : 1,
                    borderColor: theme.border,
                  }}
                  onPress={() =>
                    handleProtectedAction(() =>
                      router.push(
                        `/(app)/(patient)/book-appointment?medicId=${medic.id || ""}`,
                      ),
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: isProfileComplete ? "#FFFFFF" : theme.textSecondary,
                    }}
                  >
                    Book Appointment
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Appointments */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
              style={{
                fontSize: 20,
                fontFamily: "Nunito_600SemiBold",
                color: theme.text,
              }}
            >
              Upcoming Appointments
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/(app)/(patient)/appointments")}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: theme.primary,
                  }}
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>

          {upcomingAppointments.map((appointment, index) => (
            <MotiView
              key={appointment.id}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: "timing",
                duration: 600,
                delay: 200 + index * 100,
              }}
              style={{ marginBottom: 12 }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${theme.primary}15`,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <Calendar color={theme.primary} size={20} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      marginBottom: 4,
                    }}
                  >
                    {appointment.doctorName}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    {appointment.specialization} • {appointment.type}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Clock color={theme.textTertiary} size={12} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: theme.textTertiary,
                        marginLeft: 4,
                      }}
                    >
                      {appointment.date} at {appointment.time}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Latest Records */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 16,
            }}
          >
            Latest Records
          </Text>

          {latestRecords.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                No medical records yet.
              </Text>
            </View>
          ) : (
            latestRecords.map((record, index) => (
            <MotiView
              key={record.id || `record-${index}`}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "timing",
                duration: 600,
                delay: 300 + index * 100,
              }}
              style={{ marginBottom: 12 }}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      flex: 1,
                    }}
                  >
                    {record.title || "Medical Record"}
                  </Text>

                  <View
                    style={{
                      backgroundColor: `${theme.success}20`,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter_500Medium",
                        color: theme.success,
                      }}
                    >
                      {record.category || record.type || "Record"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {record.notes || record.summary || "Details recorded."}
                </Text>
              </View>
            </MotiView>
          ))
          )}
        </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
