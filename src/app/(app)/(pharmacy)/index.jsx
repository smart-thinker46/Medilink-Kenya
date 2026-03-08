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
  ShoppingCart,
  ClipboardList,
  Briefcase,
  Package,
  PieChart,
  MapPin,
  CreditCard,
  Bell,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  Video,
  Settings,
  Sparkles,
  User,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import SubscriptionCountdownBanner from "@/components/SubscriptionCountdownBanner";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { getPharmacyProfileCompletion } from "@/utils/pharmacyProfileCompletion";
import { useNotifications } from "@/utils/useNotifications";
import { useAuthStore } from "@/utils/auth/store";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

export default function PharmacyHomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { profile } = usePharmacyProfile();
  const { unreadCount } = useNotifications();
  const { auth } = useAuthStore();
  const firstName = getFirstName(auth?.user, "Pharmacy Admin");
  const timeGreeting = getTimeGreeting();
  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();

  const completion = useMemo(
    () => getPharmacyProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;
  const isVerified = Boolean(profile?.verified || profile?.isVerified);
  const isWide = screenWidth >= 1024;
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["pharmacy-orders"],
    queryFn: () => apiClient.getOrders(),
  });

  const productsQuery = useQuery({
    queryKey: ["pharmacy-products", pharmacyId],
    queryFn: () => apiClient.getProducts(pharmacyId),
    enabled: Boolean(pharmacyId),
  });
  const analyticsQuery = useQuery({
    queryKey: ["pharmacy-analytics", pharmacyId],
    queryFn: () => apiClient.getPharmacyAnalytics(pharmacyId),
    enabled: Boolean(pharmacyId),
  });
  const walletQuery = useQuery({
    queryKey: ["wallet", "pharmacy", pharmacyId],
    queryFn: () => apiClient.getWallet(pharmacyId || undefined),
    enabled: Boolean(pharmacyId),
  });
  const requestWithdrawalMutation = useMutation({
    mutationFn: () =>
      apiClient.requestWalletWithdrawal({
        ownerId: pharmacyId || undefined,
        amount: Number(withdrawAmount),
        destination: auth?.user?.phone || "",
        note: "Pharmacy wallet withdrawal request",
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

  const handleProtected = (action) => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Pharmacy Profile",
        "Please complete at least 99% of your profile before processing orders or selling products.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(pharmacy)/edit-profile"),
          },
        ],
      );
      return;
    }
    action();
  };

  const quickActions = [
    {
      id: "pos",
      title: "POS",
      description: "Make a sale",
      icon: ShoppingCart,
      color: theme.primary,
      onPress: () => handleProtected(() => router.push("/(app)/(pharmacy)/pos")),
    },
    {
      id: "orders",
      title: "Orders",
      description: "Incoming requests",
      icon: ClipboardList,
      color: theme.accent,
      onPress: () => handleProtected(() => router.push("/(app)/(pharmacy)/orders")),
    },
    {
      id: "products",
      title: "Products",
      description: "Manage inventory",
      icon: Package,
      color: theme.success,
      onPress: () => handleProtected(() => router.push("/(app)/(pharmacy)/products")),
    },
    {
      id: "jobs",
      title: "Jobs",
      description: "Post hiring opportunities",
      icon: Briefcase,
      color: theme.primary,
      onPress: () => handleProtected(() => router.push("/(app)/(pharmacy)/jobs")),
    },
    {
      id: "payments",
      title: "Payments",
      description: "Subscription & payouts",
      icon: CreditCard,
      color: theme.warning,
      onPress: () => router.push("/(app)/(pharmacy)/payments"),
    },
    {
      id: "ai-assistant",
      title: "AI Assistant",
      description: "Smart pharmacy insights",
      icon: Sparkles,
      color: theme.info,
      onPress: () => router.push("/(app)/(pharmacy)/ai-assistant"),
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
      id: "analytics",
      title: "Analytics",
      description: "Store performance",
      icon: PieChart,
      color: theme.info,
      onPress: () => router.push("/(app)/(pharmacy)/analytics"),
    },
  ];

  const orderCount = ordersQuery.data?.items?.length || ordersQuery.data?.length || 0;
  const productCount = productsQuery.data?.length || 0;
  const analytics = analyticsQuery.data || {};
  const analyticsTotals = analytics.totals || {};
  const wallet = walletQuery.data?.summary || analytics.wallet || {};
  const walletTransactions = walletQuery.data?.transactions || [];
  const walletWithdrawals = walletQuery.data?.withdrawals || [];
  const salesCurrency = analytics.currency || "KES";
  const sidebarLinks = [
    { key: "dashboard", title: "Dashboard", href: "/(app)/(pharmacy)", icon: Home },
    { key: "orders", title: "Orders", href: "/(app)/(pharmacy)/orders", icon: ClipboardList },
    { key: "products", title: "Products", href: "/(app)/(pharmacy)/products", icon: Package },
    { key: "pos", title: "POS", href: "/(app)/(pharmacy)/pos", icon: ShoppingCart },
    { key: "jobs", title: "Jobs", href: "/(app)/(pharmacy)/jobs", icon: Briefcase },
    { key: "ai-finder", title: "AI Finder", href: "/(app)/(shared)/ai-finder", icon: Sparkles },
    { key: "analytics", title: "Analytics", href: "/(app)/(pharmacy)/analytics", icon: PieChart },
    { key: "stock", title: "Stock History", href: "/(app)/(pharmacy)/stock-movements", icon: Package },
    { key: "location", title: "Location", href: "/(app)/(shared)/location", icon: MapPin },
    { key: "payments", title: "Payments", href: "/(app)/(pharmacy)/payments", icon: CreditCard },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "video", title: "Video Call", href: "/(app)/(pharmacy)/video-call", icon: Video },
    { key: "notifications", title: "Notifications", href: "/(app)/(shared)/notifications", icon: Bell },
    { key: "profile", title: "Profile", href: "/(app)/(pharmacy)/profile", icon: User },
    { key: "edit-profile", title: "Edit Profile", href: "/(app)/(pharmacy)/edit-profile", icon: Settings },
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
              Pharmacy Menu
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
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
              }}
            >
              {firstName}
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

        <View style={{ paddingHorizontal: 24 }}>
          <PharmacyScopeSelector
            visible={isSuperAdmin}
            pharmacies={pharmacies}
            selectedPharmacyId={pharmacyId}
            onSelect={setSelectedPharmacyTenantId}
            loading={isLoadingScope}
          />
        </View>

        <SubscriptionCountdownBanner
          createdAt={profile?.createdAt}
          subscriptionActive={Boolean(profile?.subscriptionActive)}
          theme={theme}
        />

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
                {isVerified ? "Verified Pharmacy" : "Verification Pending"}
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
        {completion.percent < 100 && (
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
                onPress={() => router.push("/(app)/(pharmacy)/edit-profile")}
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

        {/* Business Summary */}
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
                marginBottom: 6,
              }}
            >
              Products: {productCount}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Pending orders: {orderCount}
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
              {salesCurrency} {Number(wallet.availableBalance || 0).toLocaleString()}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              Pending: {salesCurrency} {Number(wallet.pendingBalance || 0).toLocaleString()}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              Paid transactions: {Number(wallet.paidTransactions || 0)}
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
                {String(item.status || "").toUpperCase()} • {salesCurrency}{" "}
                {Number(item.amount || 0).toLocaleString()} •{" "}
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
                {String(item.status || "").toUpperCase()} • {salesCurrency}{" "}
                {Number(item.amount || 0).toLocaleString()} •{" "}
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

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
            onPress={() => router.push("/(app)/(pharmacy)/analytics")}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  Store Operations Hub
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                  Analytics, inventory alerts, stock history and location tools
                </Text>
              </View>
              <PieChart color={theme.primary} size={20} />
            </View>
            <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Orders: {analyticsTotals.totalOrders ?? orderCount}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Products: {analyticsTotals.totalProducts ?? productCount}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Sales: {salesCurrency} {Number(analyticsTotals.moneyFromSales || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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

        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
