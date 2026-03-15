import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import {
  Home,
  Users,
  Calendar,
  Briefcase,
  PieChart,
  Bell,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  MessageCircle,
  User,
  Video,
  Settings,
  ShoppingCart,
  Sparkles,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import SubscriptionCountdownBanner from "@/components/SubscriptionCountdownBanner";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useMedicProfile } from "@/utils/useMedicProfile";
import { getMedicProfileCompletion } from "@/utils/medicProfileCompletion";
import { useNotifications } from "@/utils/useNotifications";
import { useAuthStore } from "@/utils/auth/store";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";
import UserAvatar from "@/components/UserAvatar";

const AI_LOCKED_MESSAGE =
  "AI is a premium feature and require to be unlocked for you to use it.";

export default function MedicHomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { profile } = useMedicProfile();
  const { unreadCount } = useNotifications();
  const { auth } = useAuthStore();
  const avatarUser = { ...(auth?.user || {}), ...(profile || {}) };
  const isWide = screenWidth >= 1024;
  const {
    isSuperAdmin,
    medicUserId,
    medics,
    selectedMedic,
    setSelectedMedicUserId,
    isLoadingScope,
  } = useMedicScope();
  const firstName = isSuperAdmin
    ? getFirstName(selectedMedic, "Medic")
    : getFirstName(avatarUser, "Medic");
  const timeGreeting = getTimeGreeting();

  const completion = useMemo(
    () => getMedicProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = isSuperAdmin || completion.percent >= 99;
  const isVerified = Boolean(profile?.verified || profile?.isVerified);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["medic-patients", medicUserId],
    queryFn: () =>
      apiClient.getMedicalRecords(undefined, {
        medic_id: medicUserId || undefined,
      }),
    enabled: Boolean(medicUserId),
  });

  const appointmentsQuery = useQuery({
    queryKey: ["medic-appointments", medicUserId],
    queryFn: () => apiClient.getAppointments({ status: "confirmed" }),
  });
  const medicAnalyticsQuery = useQuery({
    queryKey: ["medic-analytics", "me", medicUserId],
    queryFn: () => apiClient.getMedicAnalytics({ medicId: medicUserId || undefined }),
    enabled: Boolean(medicUserId),
  });
  const walletQuery = useQuery({
    queryKey: ["wallet", "medic", medicUserId],
    queryFn: () => apiClient.getWallet(medicUserId || undefined),
    enabled: Boolean(medicUserId),
  });
  const requestWithdrawalMutation = useMutation({
    mutationFn: () =>
      apiClient.requestWalletWithdrawal({
        ownerId: medicUserId || undefined,
        amount: Number(withdrawAmount),
        destination: auth?.user?.phone || "",
        note: "Medic wallet withdrawal request",
      }),
    onSuccess: () => {
      setWithdrawAmount("");
      walletQuery.refetch();
      Alert.alert("Success", "Withdrawal request sent to admin.");
    },
    onError: (error) => {
      Alert.alert("Withdrawal failed", error?.message || "Unable to request withdrawal.");
    },
  });
  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "medic-home"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });
  const aiCanUse = aiSettingsQuery.isSuccess ? Boolean(aiSettingsQuery.data?.canUse) : true;
  const aiIsPremium = aiSettingsQuery.isSuccess ? Boolean(aiSettingsQuery.data?.isPremium) : true;
  const aiBlockedMessage = String(aiSettingsQuery.data?.blockedReason || AI_LOCKED_MESSAGE);

  const openAiFinder = () => {
    if (!aiCanUse) {
      if (!aiIsPremium) {
        router.push({
          pathname: "/(app)/(shared)/subscription-checkout",
          params: { role: "MEDIC" },
        });
        return;
      }
      Alert.alert("AI Locked", aiBlockedMessage);
      return;
    }
    router.push("/(app)/(shared)/ai-finder");
  };

  const handleProtected = (action) => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Medic Profile",
        "Please complete at least 99% of your profile before receiving patients or applying to shifts.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(medic)/edit-profile"),
          },
        ],
      );
      return;
    }
    action();
  };

  const quickActions = [
    {
      id: "patients",
      title: "My Patients",
      description: "Active patients",
      icon: Users,
      color: theme.primary,
      onPress: () => router.push("/(app)/(medic)/patients"),
    },
    {
      id: "sessions",
      title: "Sessions",
      description: "Booked appointments",
      icon: Calendar,
      color: theme.accent,
      onPress: () => router.push("/(app)/(medic)/appointments"),
    },
    {
      id: "shifts",
      title: "Apply for Shifts",
      description: "Hospital shift opportunities",
      icon: Briefcase,
      color: theme.success,
      onPress: () => handleProtected(() => router.push("/(app)/(medic)/shifts")),
    },
    {
      id: "jobs",
      title: "Explore Jobs",
      description: "Detailed job listings",
      icon: Briefcase,
      color: theme.info,
      onPress: () => handleProtected(() => router.push("/(app)/(medic)/jobs")),
    },
    {
      id: "payments",
      title: "Payments",
      description: "From patients/hospitals",
      icon: CreditCard,
      color: theme.warning,
      onPress: () => router.push("/(app)/(medic)/payments"),
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      description: "Buy medicines & equipment",
      icon: ShoppingCart,
      color: theme.primary,
      onPress: () => router.push("/(app)/(medic)/pharmacy-marketplace"),
    },
    {
      id: "ai-finder",
      title: "AI Finder",
      description: "Find medicines, pharmacies, medics",
      icon: Sparkles,
      color: theme.info,
      onPress: openAiFinder,
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "Performance insights",
      icon: PieChart,
      color: theme.info,
      onPress: () => router.push("/(app)/(medic)/analytics"),
    },
  ];

  const activePatientsRaw = patientsQuery.data?.items || patientsQuery.data || [];
  const activePatients = isSuperAdmin
    ? activePatientsRaw.filter(
        (item) => String(item?.medicId || "") === String(medicUserId || ""),
      )
    : activePatientsRaw;
  const sessionsRaw = appointmentsQuery.data?.items || appointmentsQuery.data || [];
  const sessions = sessionsRaw.filter(
    (item) => String(item?.medicId || "") === String(medicUserId || ""),
  );
  const analyticsTotals = medicAnalyticsQuery.data?.totals || {};
  const walletSummary = walletQuery.data?.summary || medicAnalyticsQuery.data?.wallet || {};
  const walletTransactions = walletQuery.data?.transactions || [];
  const walletWithdrawals = walletQuery.data?.withdrawals || [];
  const formatMoney = (value) => `KES ${Number(value || 0).toLocaleString()}`;
  const sidebarLinks = [
    { key: "dashboard", title: "Dashboard", href: "/(app)/(medic)", icon: Home },
    { key: "patients", title: "Patients", href: "/(app)/(medic)/patients", icon: Users },
    { key: "appointments", title: "Appointments", href: "/(app)/(medic)/appointments", icon: Calendar },
    { key: "shifts", title: "Shifts", href: "/(app)/(medic)/shifts", icon: Briefcase },
    { key: "jobs", title: "Jobs", href: "/(app)/(medic)/jobs", icon: Briefcase },
    { key: "pharmacy", title: "Pharmacy", href: "/(app)/(medic)/pharmacy-marketplace", icon: ShoppingCart },
    { key: "ai-finder", title: "AI Finder", href: "/(app)/(shared)/ai-finder", icon: Sparkles },
    { key: "analytics", title: "Analytics", href: "/(app)/(medic)/analytics", icon: PieChart },
    { key: "payments", title: "Payments", href: "/(app)/(medic)/payments", icon: CreditCard },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "video", title: "Video Call", href: "/(app)/(medic)/video-call", icon: Video },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "profile", title: "Profile", href: "/(app)/(medic)/profile", icon: User },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(medic)/edit-profile", icon: Settings },
  ];
  const visibleSidebarLinks = isSuperAdmin
    ? sidebarLinks.filter((item) => item.key !== "edit-profile")
    : sidebarLinks;

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
              Medic Menu
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {visibleSidebarLinks.map((link) => {
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
                    onPress={() => (link.key === "ai-finder" ? openAiFinder() : router.push(link.href))}
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
            </ScrollView>
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
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 4,
                }}
              >
                {timeGreeting},
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: "Nunito_700Bold",
                    color: theme.text,
                  }}
                >
                  Dr. {firstName}
                </Text>
                <UserAvatar
                  user={avatarUser}
                  size={34}
                  backgroundColor={theme.surface}
                  borderColor={theme.border}
                  textColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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

          <SubscriptionCountdownBanner
            createdAt={profile?.createdAt}
            subscriptionActive={Boolean(profile?.subscriptionActive)}
            theme={theme}
          />

          {!aiCanUse && (
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                  }}
                >
                  {AI_LOCKED_MESSAGE}
                </Text>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 24 }}>
            <MedicScopeSelector
              visible={isSuperAdmin}
              medics={medics}
              selectedMedicId={medicUserId}
              onSelect={setSelectedMedicUserId}
              loading={isLoadingScope}
            />
          </View>

          {/* Verification */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
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
                  {isVerified ? "Verified Medic" : "Verification Pending"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: isVerified ? theme.success : theme.error,
                }}
              >
                {isVerified ? "Active" : "Upload docs"}
              </Text>
            </View>
          </View>

          {/* Profile Completion */}
          {!isSuperAdmin && completion.percent < 100 && (
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
                  onPress={() => router.push("/(app)/(medic)/edit-profile")}
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
              Quick Actions
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
                  transition={{ type: "timing", duration: 600, delay: 100 + index * 100 }}
                  style={{ flexBasis: "48%", flexGrow: 1, maxWidth: 320 }}
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

          {/* Patients & Sessions Summary */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Current Patients: {activePatients.length}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Upcoming sessions: {sessions.length}
              </Text>
            </View>
          </View>

          {/* Wallet */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <CreditCard color={theme.primary} size={16} />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  Wallet
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Nunito_700Bold",
                  color: theme.primary,
                  marginBottom: 8,
                }}
              >
                {formatMoney(walletSummary.availableBalance ?? analyticsTotals.moneyMade)}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Pending: {formatMoney(walletSummary.pendingBalance ?? analyticsTotals.pendingMoney)}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Paid transactions: {Number(walletSummary.paidTransactions || 0)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                <TextInput
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="Amount (KES)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingHorizontal: 10,
                    color: theme.text,
                    backgroundColor: theme.surface,
                  }}
                />
                <TouchableOpacity
                  style={{
                    marginLeft: 8,
                    backgroundColor: theme.primary,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 40,
                    justifyContent: "center",
                    opacity: requestWithdrawalMutation.isLoading ? 0.7 : 1,
                  }}
                  onPress={() => {
                    const amount = Number(withdrawAmount);
                    if (!Number.isFinite(amount) || amount <= 0) {
                      Alert.alert("Invalid amount", "Enter a valid withdrawal amount.");
                      return;
                    }
                    requestWithdrawalMutation.mutate();
                  }}
                  disabled={requestWithdrawalMutation.isLoading}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                    Withdraw
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  marginTop: 10,
                  marginBottom: 4,
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Recent wallet transactions
              </Text>
              {walletTransactions.slice(0, 3).map((item) => (
                <Text key={item.id} style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 3 }}>
                  {String(item.status || "").toUpperCase()} • {formatMoney(item.amount)} •{" "}
                  {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                </Text>
              ))}
              <Text
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Withdrawal requests
              </Text>
              {walletWithdrawals.slice(0, 2).map((item) => (
                <Text key={item.id} style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 3 }}>
                  {String(item.status || "").toUpperCase()} • {formatMoney(item.amount)} •{" "}
                  {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                </Text>
              ))}
              {walletWithdrawals.length === 0 && (
                <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                  No withdrawal requests yet.
                </Text>
              )}
              {walletQuery.isLoading && (
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                  Loading wallet...
                </Text>
              )}
              {walletQuery.isError && (
                <Text style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>
                  Could not load wallet details.
                </Text>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
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
              onPress={() => router.push("/(app)/(medic)/analytics")}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    Practice Hub
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    Analytics, patient status, finance and location tools
                  </Text>
                </View>
                <PieChart color={theme.primary} size={20} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
