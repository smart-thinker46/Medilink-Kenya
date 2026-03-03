import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import {
  Edit,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  ShoppingBag,
  Sun,
  Moon,
  HelpCircle,
  Settings,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import { useAuthStore } from "@/utils/auth/store";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import OnlineStatusChip from "@/components/OnlineStatusChip";

export default function HospitalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { auth } = useAuthStore();
  const { isUserOnline } = useOnlineUsers();
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isVerified = Boolean(profile?.verified || profile?.isVerified);
  const isOnline = isUserOnline(auth?.user);

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            {profile?.hospitalName || "Hospital Profile"}
          </Text>
          <OnlineStatusChip isOnline={isOnline} theme={theme} style={{ marginTop: 8 }} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              marginTop: 4,
            }}
          >
            {profile?.address || profile?.location?.address || "No location set"}
          </Text>
        </View>

        {completion.percent < 100 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
                  marginTop: 12,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(hospital)/edit-profile")}
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

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500 }}
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isVerified ? (
                <ShieldCheck color={theme.success} size={18} />
              ) : (
                <ShieldAlert color={theme.error} size={18} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                {isVerified ? "Hospital Verified" : "Verification Pending"}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: isVerified ? theme.success : theme.error,
              }}
            >
              {isVerified ? "Active" : "Upload license"}
            </Text>
          </MotiView>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/(hospital)/edit-profile")}
          >
            <Edit color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Edit Hospital Profile
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
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/(hospital)/payments")}
          >
            <CreditCard color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Payments & Payouts
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
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/(hospital)/pharmacy")}
          >
            <ShoppingBag color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Pharmacy Marketplace
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
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/complaint")}
          >
            <HelpCircle color={theme.warning} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Report an Issue
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
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/complaints-history")}
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
              My Complaints
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
              marginBottom: 12,
            }}
            onPress={() => router.push("/(app)/(shared)/settings")}
          >
            <Settings color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              App Settings
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
            }}
            onPress={toggleTheme}
          >
            {isDark ? (
              <Sun color={theme.primary} size={18} />
            ) : (
              <Moon color={theme.primary} size={18} />
            )}
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
