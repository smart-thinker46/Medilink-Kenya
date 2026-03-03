import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import {
  User,
  Edit,
  Heart,
  Calendar,
  FileText,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Shield,
  Bell,
  Moon,
  Sun,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/utils/api";
import OnlineStatusChip from "@/components/OnlineStatusChip";
import { useOnlineUsers } from "@/utils/useOnlineUsers";

export default function PatientProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { auth, logout } = useAuthStore();
  const { isUserOnline } = useOnlineUsers();
  const { profile } = usePatientProfile();
  const completion = getProfileCompletion(profile);
  const isOnline = isUserOnline(auth?.user);

  const appointmentsQuery = useQuery({
    queryKey: ["patient-profile-appointments"],
    queryFn: () => apiClient.getAppointments(),
  });
  const recordsQuery = useQuery({
    queryKey: ["patient-profile-records"],
    queryFn: () => apiClient.getMedicalRecords(),
  });

  const appointmentCount = (appointmentsQuery.data?.items || appointmentsQuery.data || []).length;
  const records = recordsQuery.data?.items || recordsQuery.data || [];
  const recordsCount = records.length;
  const prescriptionsCount = records.filter((record) => record?.type === "prescription").length;

  const profileStats = [
    {
      id: "appointments",
      title: "Appointments",
      value: `${appointmentCount}`,
      description: "This month",
      color: theme.primary,
      icon: Calendar,
      onPress: () => router.push("/(app)/(patient)/appointments"),
    },
    {
      id: "records",
      title: "Medical Records",
      value: `${recordsCount}`,
      description: "Total records",
      color: theme.success,
      icon: FileText,
      onPress: () =>
        router.push({
          pathname: "/(app)/(patient)/medical-history",
          params: { tab: "all" },
        }),
    },
    {
      id: "prescriptions",
      title: "Prescriptions",
      value: `${prescriptionsCount}`,
      description: "Active",
      color: theme.accent,
      icon: Heart,
      onPress: () =>
        router.push({
          pathname: "/(app)/(patient)/medical-history",
          params: { tab: "prescriptions" },
        }),
    },
  ];

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          id: "edit-profile",
          title: "Edit Profile",
          description: "Update your personal information",
          icon: Edit,
          color: theme.primary,
          onPress: () => router.push("/(app)/(patient)/edit-profile"),
        },
        {
          id: "medical-info",
          title: "Medical Information",
          description: "Emergency contacts, allergies, insurance",
          icon: Heart,
          color: theme.error,
          onPress: () => router.push("/(app)/(patient)/medical-info"),
        },
        {
          id: "payment-methods",
          title: "Payment Methods",
          description: "Manage cards and payment options",
          icon: CreditCard,
          color: theme.success,
          onPress: () => router.push("/(app)/(patient)/payment-methods"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          id: "notifications",
          title: "Notifications",
          description: "Appointment reminders, health tips",
          icon: Bell,
          color: theme.warning,
          onPress: () => router.push("/(app)/(shared)/notifications-settings"),
        },
        {
          id: "theme",
          title: "Dark Mode",
          description: isDark ? "Switch to light mode" : "Switch to dark mode",
          icon: isDark ? Sun : Moon,
          color: theme.accent,
          onPress: toggleTheme,
          showChevron: false,
          rightComponent: (
            <View
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                backgroundColor: isDark ? theme.primary : theme.border,
                padding: 2,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  transform: [{ translateX: isDark ? 22 : 0 }],
                }}
              />
            </View>
          ),
        },
        {
          id: "privacy",
          title: "Privacy & Security",
          description: "Data sharing, account security",
          icon: Shield,
          color: theme.primary,
          onPress: () => router.push("/(app)/(shared)/privacy-settings"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          id: "help",
          title: "Help & Support",
          description: "FAQs, contact support team",
          icon: HelpCircle,
          color: theme.info,
          onPress: () => router.push("/(app)/(shared)/support"),
        },
        {
          id: "complaint",
          title: "Report an Issue",
          description: "Submit a complaint or feedback",
          icon: HelpCircle,
          color: theme.warning,
          onPress: () => router.push("/(app)/complaint"),
        },
        {
          id: "complaint-history",
          title: "My Complaints",
          description: "Track complaints and resolutions",
          icon: HelpCircle,
          color: theme.primary,
          onPress: () => router.push("/(app)/complaints-history"),
        },
        {
          id: "settings",
          title: "App Settings",
          description: "Language, region, data usage",
          icon: Settings,
          color: theme.textSecondary,
          onPress: () => router.push("/(app)/(shared)/settings"),
        },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/welcome");
          },
        },
      ],
    );
  };

  const renderStatCard = ({ item, index }) => (
    <MotiView
      key={item.id}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "timing",
        duration: 600,
        delay: 200 + index * 100,
      }}
      style={{ flex: 1, marginHorizontal: index === 1 ? 8 : 0 }}
    >
      <TouchableOpacity
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={item.onPress}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: `${item.color}15`,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <item.icon color={item.color} size={24} />
        </View>

        <Text
          style={{
            fontSize: 24,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 4,
          }}
        >
          {item.value}
        </Text>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          {item.title}
        </Text>

        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: theme.textSecondary,
            textAlign: "center",
          }}
        >
          {item.description}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  const renderMenuItem = ({ item, index }) => (
    <MotiView
      key={item.id}
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: "timing",
        duration: 600,
        delay: 400 + index * 50,
      }}
    >
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={item.onPress}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${item.color}15`,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <item.icon color={item.color} size={20} />
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
            {item.title}
          </Text>

          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              lineHeight: 18,
            }}
          >
            {item.description}
          </Text>
        </View>

        {item.rightComponent ||
          (item.showChevron !== false && (
            <ChevronRight color={theme.iconColor} size={20} />
          ))}
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 600 }}
          style={{ paddingHorizontal: 24, marginBottom: 32 }}
        >
          <LinearGradient
            colors={theme.gradient.primary}
            style={{
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
            }}
          >
            {/* Profile Avatar */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontFamily: "Nunito_700Bold",
                  color: "#FFFFFF",
                }}
              >
                {auth?.user?.firstName?.[0]?.toUpperCase() || "P"}
              </Text>
            </View>

            {/* User Info */}
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: "#FFFFFF",
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              {auth?.user?.firstName} {auth?.user?.lastName}
            </Text>
            <OnlineStatusChip
              isOnline={isOnline}
              theme={theme}
              style={{ marginBottom: 8, alignSelf: "center" }}
            />

            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.8)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Patient ID: #{auth?.user?.id?.slice(-8)?.toUpperCase()}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Mail color="rgba(255,255,255,0.8)" size={14} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.8)",
                  marginLeft: 8,
                }}
              >
                {auth?.user?.email}
              </Text>
            </View>

            {auth?.user?.phone && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Phone color="rgba(255,255,255,0.8)" size={14} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.8)",
                    marginLeft: 8,
                  }}
                >
                  {auth?.user?.phone}
                </Text>
              </View>
            )}
          </LinearGradient>
        </MotiView>

        {/* Stats */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 32,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {profileStats.map((stat, index) =>
              renderStatCard({ item: stat, index }),
            )}
          </View>
        </View>

        {/* Profile completion */}
        {completion.percent < 100 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
            <View
              style={{
                backgroundColor: theme.card,
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
                Profile Completion: {completion.percent}%
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.surface,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${completion.percent}%`,
                    backgroundColor:
                      completion.percent >= 99 ? theme.success : theme.warning,
                  }}
                />
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(patient)/edit-profile")}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Complete Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Sections */}
        <View style={{ paddingHorizontal: 24 }}>
          {menuSections.map((section, sectionIndex) => (
            <View key={section.title} style={{ marginBottom: 32 }}>
              <MotiView
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: "timing",
                  duration: 600,
                  delay: 300 + sectionIndex * 100,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Nunito_600SemiBold",
                    color: theme.text,
                    marginBottom: 16,
                  }}
                >
                  {section.title}
                </Text>
              </MotiView>

              {section.items.map((item, itemIndex) =>
                renderMenuItem({ item, index: itemIndex }),
              )}
            </View>
          ))}

          {/* Logout Button */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 600, delay: 800 }}
          >
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${theme.error}15`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: `${theme.error}30`,
              }}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut color={theme.error} size={20} />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.error,
                  marginLeft: 12,
                }}
              >
                Sign Out
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* App Version */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 600, delay: 900 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: theme.textTertiary,
                textAlign: "center",
              }}
            >
              Medilink Kenya v1.0.0
            </Text>
          </MotiView>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
