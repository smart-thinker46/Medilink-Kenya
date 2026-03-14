import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { MotiView } from "moti";
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  Clock,
  PieChart,
  CreditCard,
  Pill,
  ShieldCheck,
  ShieldAlert,
  Plus,
  DollarSign,
  MessageCircle,
  Video,
  Building2,
  Bell,
  Settings,
  Crown,
  Package,
  Sparkles,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import SubscriptionCountdownBanner from "@/components/SubscriptionCountdownBanner";
import { useAppTheme } from "@/components/ThemeProvider";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import { useNotifications } from "@/utils/useNotifications";
import apiClient from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/utils/i18n";
import { resolveMediaUrl } from "@/utils/media";
import { useAuthStore } from "@/utils/auth/store";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";
import UserAvatar from "@/components/UserAvatar";

export default function HospitalHomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { t } = useI18n();
  const { profile } = useHospitalProfile();
  const { auth } = useAuthStore();
  const avatarUser = { ...(auth?.user || {}), ...(profile || {}) };
  const isSuperAdmin = String(auth?.user?.role || "").toUpperCase() === "SUPER_ADMIN";
  const isWide = screenWidth >= 1024;
  const { unreadCount } = useNotifications();
  const firstName = getFirstName(auth?.user, "Hospital Admin");
  const timeGreeting = getTimeGreeting();

  const jobsQuery = useQuery({
    queryKey: ["hospital-jobs"],
    queryFn: () => apiClient.getJobs(),
  });
  const shiftsQuery = useQuery({
    queryKey: ["hospital-shifts"],
    queryFn: () => apiClient.getShifts(),
  });
  const appointmentsQuery = useQuery({
    queryKey: ["hospital-appointments"],
    queryFn: () => apiClient.getAppointments({ status: "pending" }),
  });
  const medicsQuery = useQuery({
    queryKey: ["hospital-medics"],
    queryFn: () => apiClient.getMedics(),
  });
  const analyticsQuery = useQuery({
    queryKey: ["hospital-facility-analytics"],
    queryFn: () => apiClient.getHospitalAnalytics(),
  });

  const jobs = jobsQuery.data || [];
  const shifts = shiftsQuery.data || [];
  const applicantIds = useMemo(() => {
    const ids = new Set();
    const jobItems = jobsQuery.data?.items || jobsQuery.data || [];
    const shiftItems = shiftsQuery.data?.items || shiftsQuery.data || [];
    jobItems.forEach((job) => {
      const apps = Array.isArray(job?.applications) ? job.applications : [];
      apps.forEach((app) => {
        if (app?.medicId) ids.add(String(app.medicId));
      });
    });
    shiftItems.forEach((shift) => {
      const apps = Array.isArray(shift?.applications) ? shift.applications : [];
      apps.forEach((app) => {
        if (app?.medicId) ids.add(String(app.medicId));
      });
    });
    return Array.from(ids);
  }, [jobsQuery.data, shiftsQuery.data]);
  const applicantCount = applicantIds.length;
  const appointmentRequests = appointmentsQuery.data?.items || appointmentsQuery.data || [];
  const medics = medicsQuery.data?.items || medicsQuery.data || [];
  const linkedPatientId = appointmentRequests[0]?.patientId || appointmentRequests[0]?.patient_id || "";
  const linkedMedicId = medics[0]?.id || medics[0]?.medicId || "";

  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const analyticsTotals = analyticsQuery.data?.totals || {};
  const topBoughtProducts = analyticsQuery.data?.topBoughtProducts || [];
  const formatMoney = (value) => `KES ${Number(value || 0).toLocaleString()}`;
  const isProfileComplete = completion.percent >= 99;
  const isVerified = Boolean(profile?.verified || profile?.isVerified);

  const handleProtectedAction = (action) => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Hospital Profile",
        "Please complete at least 99% of your hospital profile before hiring medics or receiving patient requests.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(hospital)/edit-profile"),
          },
        ],
      );
      return;
    }
    action();
  };

  const quickActions = [
    {
      id: "post-job",
      title: "Post Job",
      description: "Publish hiring opportunities",
      icon: Plus,
      color: theme.primary,
      onPress: () => handleProtectedAction(() => router.push("/(app)/(hospital)/job-create")),
    },
    {
      id: "create-shift",
      title: "Create Shift",
      description: "Schedule medic shifts",
      icon: Clock,
      color: theme.info,
      onPress: () => handleProtectedAction(() => router.push("/(app)/(hospital)/shift-create")),
    },
    {
      id: "services",
      title: "Hospital Services",
      description: "List services for discovery",
      icon: ClipboardList,
      color: theme.accent,
      onPress: () => handleProtectedAction(() => router.push("/(app)/(hospital)/services")),
    },
    {
      id: "review-medics",
      title: "Review Medics",
      description: "Approve applications",
      icon: Users,
      color: theme.accent,
      badge: applicantCount,
      onPress: () => handleProtectedAction(() => router.push("/(app)/(hospital)/medics")),
    },
    {
      id: "appointments",
      title: "Patient Requests",
      description: "Appointments inbox",
      icon: Calendar,
      color: theme.success,
      onPress: () => handleProtectedAction(() => router.push("/(app)/(hospital)/appointments")),
    },
    {
      id: "payments",
      title: "Payments",
      description: "Receive & pay",
      icon: DollarSign,
      color: theme.warning,
      onPress: () => router.push("/(app)/(hospital)/payments"),
    },
    {
      id: "ai-finder",
      title: "AI Finder",
      description: "Find medicines, pharmacies, medics",
      icon: Sparkles,
      color: theme.info,
      onPress: () => router.push("/(app)/(shared)/ai-finder"),
    },
  ];
  const sidebarLinks = [
    ...(isSuperAdmin
      ? [{ key: "back-admin", title: "Back to Admin", href: "/(app)/(admin)", icon: LayoutDashboard }]
      : []),
    { key: "dashboard", title: "Dashboard", href: "/(app)/(hospital)", icon: Home },
    { key: "staffing", title: "Staffing", href: "/(app)/(hospital)/staffing", icon: Briefcase },
    { key: "jobs", title: "Jobs", href: "/(app)/(hospital)/jobs", icon: Briefcase },
    { key: "medics", title: "Medics", href: "/(app)/(hospital)/medics", icon: Users },
    { key: "appointments", title: "Appointments", href: "/(app)/(hospital)/appointments", icon: Calendar },
    { key: "services", title: "Services", href: "/(app)/(hospital)/services", icon: ClipboardList },
    { key: "pharmacy", title: "Pharmacy", href: "/(app)/(hospital)/pharmacy", icon: Pill },
    { key: "ai-finder", title: "AI Finder", href: "/(app)/(shared)/ai-finder", icon: Sparkles },
    { key: "analytics", title: "Analytics", href: "/(app)/(hospital)/analytics", icon: PieChart },
    { key: "payments", title: "Payments", href: "/(app)/(hospital)/payments", icon: CreditCard },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "video", title: "Video Call", href: "/(app)/(hospital)/video-call", icon: Video },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "profile", title: "Profile", href: "/(app)/(hospital)/profile", icon: Building2 },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(hospital)/edit-profile", icon: Settings },
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
              Hospital Menu
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                {firstName}
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isVerified ? `${theme.success}15` : `${theme.error}15`,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              {isVerified ? (
                <ShieldCheck color={theme.success} size={16} />
              ) : (
                <ShieldAlert color={theme.error} size={16} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: isVerified ? theme.success : theme.error,
                  marginLeft: 6,
                }}
              >
                {isVerified ? "Verified" : "Not Verified"}
              </Text>
            </View>

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
          </View>

          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 12,
            }}
            onPress={() => router.push("/(app)/(shared)/settings")}
          >
            <Settings color={theme.iconColor} size={20} />
          </TouchableOpacity>
        </View>

        <SubscriptionCountdownBanner
          createdAt={profile?.createdAt}
          subscriptionActive={Boolean(profile?.subscriptionActive)}
          theme={theme}
        />

        {/* Profile Completion */}
        {completion.percent < 100 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View
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
                    backgroundColor: isProfileComplete ? theme.success : theme.warning,
                  }}
                />
              </View>

              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Complete your profile to hire medics and receive patient requests.
              </Text>

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

        {/* Operational Summary */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
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
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Operational Summary
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Open shifts: {shifts.length} • Open jobs: {jobs.length}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginTop: 4,
              }}
            >
              Pending requests: {appointmentRequests.length}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginTop: 4,
              }}
            >
              Available medics: {medics.length}
            </Text>
          </View>
        </View>

        {/* Facility Analytics */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
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
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 12,
              }}
            >
              Facility Analytics
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Shifts Created</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.shiftsCreated || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Shifts Cancelled</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.shiftsCancelled || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Applications</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.appliedShifts || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Medics Hired</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.hiredMedics || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Shifts Completed</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.shiftsCompleted || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Hours Remaining</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.hoursRemaining || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Amount Paid</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {formatMoney(analyticsTotals.amountPaid)}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Pending Payments</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.pendingPayments || 0} ({formatMoney(analyticsTotals.pendingAmount)})
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Total To Pay</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {formatMoney(analyticsTotals.totalAmountToPay)}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Products Created</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.totalProducts || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Products Sold</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {analyticsTotals.soldProducts || 0}
                </Text>
              </View>
              <View style={{ flexBasis: "48%", backgroundColor: theme.surface, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>Sales Revenue</Text>
                <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Inter_700Bold" }}>
                  {formatMoney(analyticsTotals.salesRevenue)}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Most Bought Products
            </Text>
            {topBoughtProducts.length ? (
              topBoughtProducts.slice(0, 5).map((item) => (
                <View
                  key={`${item.productId}-${item.productName}`}
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      backgroundColor: theme.surface,
                      marginRight: 8,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.imageUrl || item.image || item.photoUrl ? (
                      <Image
                        source={{ uri: resolveMediaUrl(item.imageUrl || item.image || item.photoUrl) }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Package color={theme.iconColor} size={12} />
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>
                    {item.productName}: {item.quantity}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                No sold products yet.
              </Text>
            )}
            <TouchableOpacity
              style={{
                marginTop: 10,
                backgroundColor: theme.surface,
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
              }}
              onPress={() => router.push("/(app)/(hospital)/analytics")}
            >
              <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                Open Full Analytics
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
                    position: "relative",
                  }}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                >
                  {action.badge ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        backgroundColor: theme.primary,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: `${theme.primary}55`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter_700Bold",
                          color: "#fff",
                        }}
                      >
                        {action.badge}
                      </Text>
                    </View>
                  ) : null}
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

        {/* Communication */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 16,
            }}
          >
            {t("communication")}
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
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/(app)/(shared)/conversations")}
            >
              <MessageCircle color={theme.iconColor} size={18} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                Chat Center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/(app)/(hospital)/video-call")}
            >
              <Video color={theme.iconColor} size={18} />
              <Crown color={theme.warning} size={14} style={{ marginLeft: 6 }} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                Video Interviews
              </Text>
            </TouchableOpacity>
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
                From your medics list
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: linkedPatientId ? theme.card : theme.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: linkedPatientId ? 1 : 0.6,
              }}
              disabled={!linkedPatientId}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/location",
                  params: { targetId: linkedPatientId, title: "Patient Location" },
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
                View Patient Location
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                From appointment requests
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

        {/* Hospital Actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 16,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push("/(app)/(hospital)/profile")}
          >
            <Building2 color={theme.primary} size={20} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Manage Hospital Profile
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
