import React, { useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import Svg, { Circle, G } from "react-native-svg";
import { ArrowLeft, Download, Package, BellRing } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { shareCsv } from "@/utils/csvExport";
import { resolveMediaUrl } from "@/utils/media";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

const Donut = ({ title, data = [], theme, size = 112, stroke = 14 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let running = 0;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 160,
        backgroundColor: theme.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
        {title}
      </Text>
      <View style={{ alignItems: "center", justifyContent: "center", marginTop: 10 }}>
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Svg width={size} height={size}>
            <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.surface}
                strokeWidth={stroke}
                fill="transparent"
              />
              {total > 0 &&
                data.map((item, index) => {
                  const value = Number(item.value || 0);
                  const segment = (value / total) * circumference;
                  const dashoffset = circumference - running;
                  running += segment;
                  return (
                    <Circle
                      key={`${item.label}-${index}`}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${segment} ${circumference - segment}`}
                      strokeDashoffset={dashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  );
                })}
            </G>
          </Svg>
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Nunito_700Bold", color: theme.text }}>
              {total}
            </Text>
            <Text style={{ fontSize: 10, color: theme.textSecondary }}>Total</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        {data.map((item) => (
          <View
            key={`${title}-${item.label}`}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: item.color,
                marginRight: 6,
              }}
            />
            <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>{item.label}</Text>
            <Text style={{ fontSize: 11, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const formatDateInput = (value) => String(value || "").slice(0, 10);

export default function PharmacyAnalyticsScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();

  const [preset, setPreset] = useState("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = useMemo(() => {
    if (preset === "custom") {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      return params;
    }
    return { preset };
  }, [preset, startDate, endDate]);

  const analyticsQuery = useQuery({
    queryKey: ["pharmacy-analytics-full", pharmacyId, preset, startDate, endDate],
    queryFn: () => apiClient.getPharmacyAnalytics(pharmacyId, queryParams),
    enabled: Boolean(pharmacyId),
  });

  const reorderMutation = useMutation({
    mutationFn: () => apiClient.createPharmacyReorderDraft(pharmacyId, { preset }),
    onSuccess: (res) => {
      Alert.alert(
        "Reorder Draft Created",
        `Draft created with ${res?.draft?.items?.length || 0} items.`,
      );
      analyticsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert("Failed", error?.message || "Could not create reorder draft.");
    },
  });

  const smartAlertMutation = useMutation({
    mutationFn: () => apiClient.runPharmacySmartAlerts(pharmacyId),
    onSuccess: (res) => {
      Alert.alert(
        "Smart Alerts",
        `${res?.alertsGenerated || 0} alerts generated and sent to notifications.`,
      );
    },
    onError: (error) => {
      Alert.alert("Failed", error?.message || "Could not run smart alerts.");
    },
  });

  const analytics = analyticsQuery.data || {};
  const totals = analytics.totals || {};
  const charts = analytics.charts || {};
  const topSoldProducts = analytics.topSoldProducts || [];
  const currency = analytics.currency || "KES";
  const demandForecast = analytics.demandForecast || [];
  const autoReorder = analytics.autoReorder || {};
  const expiryManagement = analytics.expiryManagement || {};
  const profitAnalytics = analytics.profitAnalytics || {};
  const prescriptionQueue = analytics.prescriptionQueue || {};
  const substitutionEngine = analytics.substitutionEngine || {};
  const conversionFunnel = analytics.conversionFunnel || {};
  const customerInsights = analytics.customerInsights || {};
  const riskChecks = analytics.riskChecks || {};
  const slaDashboard = analytics.slaDashboard || {};
  const multiBranch = analytics.multiBranch || {};
  const smartNotifications = analytics.smartNotifications || {};

  const doExportCsv = async () => {
    const rows = [
      ["Total Orders", totals.totalOrders || 0],
      ["Completed Orders", totals.completedOrders || 0],
      ["Pending Orders", totals.pendingOrders || 0],
      ["Cancelled Orders", totals.cancelledOrders || 0],
      ["Money From Sales", `${currency} ${Number(totals.moneyFromSales || 0).toLocaleString()}`],
      ["Total Products", totals.totalProducts || 0],
      ["Sold Products", totals.soldProducts || 0],
      ["Low Stock", totals.lowStock || 0],
      ["Out Of Stock", totals.outOfStock || 0],
      ["Gross Profit", `${currency} ${Number(profitAnalytics?.totals?.grossProfit || 0).toLocaleString()}`],
      ["Gross Margin %", Number(profitAnalytics?.totals?.grossMarginPct || 0).toFixed(2)],
      ["Abandonment Rate %", Number(conversionFunnel?.abandonmentRate || 0).toFixed(1)],
      ["SLA Avg Fulfillment (mins)", Number(slaDashboard?.avgFulfillmentMins || 0).toFixed(1)],
      ["Range Start", analytics?.filters?.startDate || ""],
      ["Range End", analytics?.filters?.endDate || ""],
    ];

    topSoldProducts.forEach((item) => {
      rows.push([`Top Sold: ${item.productName || item.productId || "Product"}`, item.quantity || 0]);
    });

    await shareCsv({
      filename: `pharmacy-analytics-${Date.now()}.csv`,
      headers: ["Metric", "Value"],
      rows,
      dialogTitle: "Share pharmacy analytics",
    });
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(pharmacy)"))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft color={theme.iconColor} size={18} />
          </TouchableOpacity>

          <Text style={{ fontSize: 20, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Store Analytics
          </Text>

          <TouchableOpacity
            onPress={doExportCsv}
            style={{
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Download color="#FFFFFF" size={15} />
            <Text style={{ marginLeft: 6, color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              CSV
            </Text>
          </TouchableOpacity>
        </View>

        <PharmacyScopeSelector
          visible={isSuperAdmin}
          pharmacies={pharmacies}
          selectedPharmacyId={pharmacyId}
          onSelect={setSelectedPharmacyTenantId}
          loading={isLoadingScope}
        />

        <View
          style={{
            marginTop: 16,
            backgroundColor: theme.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>Time Range</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { key: "today", label: "Today" },
              { key: "7d", label: "7 Days" },
              { key: "30d", label: "30 Days" },
              { key: "custom", label: "Custom" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setPreset(item.key)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: preset === item.key ? theme.primary : theme.border,
                  backgroundColor: preset === item.key ? theme.primary : theme.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: preset === item.key ? "#FFFFFF" : theme.text,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {preset === "custom" ? (
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
              <TextInput
                value={startDate}
                onChangeText={(value) => setStartDate(formatDateInput(value))}
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: theme.text,
                  backgroundColor: theme.surface,
                  fontSize: 12,
                }}
              />
              <TextInput
                value={endDate}
                onChangeText={(value) => setEndDate(formatDateInput(value))}
                placeholder="End YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: theme.text,
                  backgroundColor: theme.surface,
                  fontSize: 12,
                }}
              />
            </View>
          ) : null}
        </View>

        {analyticsQuery.isLoading ? (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
              Loading analytics...
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: theme.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Total Orders</Text>
                <Text style={{ fontSize: 18, color: theme.text, fontFamily: "Nunito_700Bold" }}>{totals.totalOrders || 0}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: theme.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Completed Orders</Text>
                <Text style={{ fontSize: 18, color: theme.success, fontFamily: "Nunito_700Bold" }}>{totals.completedOrders || 0}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: theme.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Money Made</Text>
                <Text style={{ fontSize: 16, color: theme.primary, fontFamily: "Nunito_700Bold" }}>
                  {currency} {Number(totals.moneyFromSales || 0).toLocaleString()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 150, backgroundColor: theme.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Sold Products</Text>
                <Text style={{ fontSize: 18, color: theme.accent, fontFamily: "Nunito_700Bold" }}>{totals.soldProducts || 0}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              <Donut
                title="Orders Status"
                theme={theme}
                data={[
                  {
                    label: "Completed",
                    value: charts?.orderStatus?.find((d) => d.label === "Completed")?.value || 0,
                    color: theme.success,
                  },
                  {
                    label: "Pending",
                    value: charts?.orderStatus?.find((d) => d.label === "Pending")?.value || 0,
                    color: theme.warning,
                  },
                  {
                    label: "Cancelled",
                    value: charts?.orderStatus?.find((d) => d.label === "Cancelled")?.value || 0,
                    color: theme.error,
                  },
                ]}
              />
              <Donut
                title="Stock Status"
                theme={theme}
                data={[
                  {
                    label: "In Stock",
                    value: charts?.productStock?.find((d) => d.label === "In Stock")?.value || 0,
                    color: theme.success,
                  },
                  {
                    label: "Low Stock",
                    value: charts?.productStock?.find((d) => d.label === "Low Stock")?.value || 0,
                    color: theme.warning,
                  },
                  {
                    label: "Out of Stock",
                    value: charts?.productStock?.find((d) => d.label === "Out of Stock")?.value || 0,
                    color: theme.error,
                  },
                ]}
              />
              <Donut
                title="Checkout Funnel"
                theme={theme}
                data={[
                  { label: "Views", value: conversionFunnel.productViews || 0, color: theme.primary },
                  { label: "Cart", value: conversionFunnel.cartAdds || 0, color: theme.warning },
                  { label: "Checkout", value: conversionFunnel.checkoutStarted || 0, color: theme.accent },
                  { label: "Paid", value: conversionFunnel.checkoutCompleted || 0, color: theme.success },
                ]}
              />
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Auto Reorder
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                {autoReorder?.totalSuggestedItems || 0} suggested items • Est.
                {` ${currency} ${Number(autoReorder?.totalEstimatedCost || 0).toLocaleString()}`}
              </Text>
              <TouchableOpacity
                onPress={() => reorderMutation.mutate()}
                disabled={reorderMutation.isPending}
                style={{
                  marginTop: 10,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  paddingVertical: 10,
                  alignItems: "center",
                  opacity: reorderMutation.isPending ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {reorderMutation.isPending ? "Creating..." : "Create Reorder Draft"}
                </Text>
              </TouchableOpacity>
              {(autoReorder?.suggestions || []).slice(0, 5).map((item) => (
                <View key={item.productId} style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    Stock {item.stock} • Reorder {item.recommendedQty} • {item.priority}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Expiry Management
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                Expired: {expiryManagement?.buckets?.expired || 0} • 0-30d: {expiryManagement?.buckets?.days0to30 || 0}
              </Text>
              {(expiryManagement?.clearanceSuggestions || []).slice(0, 5).map((item) => (
                <Text key={`${item.productId}-clearance`} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {item.name}: {item.daysUntilExpiry} days • Suggested discount {item.suggestedDiscountPercent}%
                </Text>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Profit Analytics
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                Revenue: {currency} {Number(profitAnalytics?.totals?.revenue || 0).toLocaleString()}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                Cost: {currency} {Number(profitAnalytics?.totals?.cost || 0).toLocaleString()}
              </Text>
              <Text style={{ color: theme.success, fontSize: 12, marginTop: 2 }}>
                Gross Profit: {currency} {Number(profitAnalytics?.totals?.grossProfit || 0).toLocaleString()} ({Number(profitAnalytics?.totals?.grossMarginPct || 0).toFixed(2)}%)
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Prescription Queue
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                Awaiting upload: {prescriptionQueue.awaitingUpload || 0} • Pending review: {prescriptionQueue.pendingReview || 0} • Completed: {prescriptionQueue.approvedOrCompleted || 0}
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Substitution Engine
              </Text>
              {(substitutionEngine?.suggestions || []).slice(0, 4).map((entry) => (
                <View key={entry.productId} style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                    {entry.name}
                  </Text>
                  {(entry.alternatives || []).map((alt) => (
                    <Text key={`${entry.productId}-${alt.productId}`} style={{ color: theme.textSecondary, fontSize: 11 }}>
                      - {alt.name} (Stock {alt.stock}, {currency} {Number(alt.price || 0).toLocaleString()})
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Demand Forecast
              </Text>
              {(demandForecast || []).slice(0, 6).map((item) => (
                <Text key={item.productId} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {item.name}: 7d forecast {item.forecast7d}, stock-out in {item.stockOutInDays ?? "N/A"} days
                </Text>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Customer Insights
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                Unique: {customerInsights.uniqueCustomers || 0} • Repeat: {customerInsights.repeatCustomers || 0} • Retention: {Number(customerInsights.retentionRate || 0).toFixed(1)}%
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                Avg basket: {currency} {Number(customerInsights.averageBasketValue || 0).toLocaleString()}
              </Text>
              {(customerInsights.topCustomers || []).slice(0, 5).map((item) => (
                <Text key={item.customerId} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {item.name}: {item.orders} orders • {currency} {Number(item.spend || 0).toLocaleString()}
                </Text>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Risk & SLA
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                Failed payments: {riskChecks.failedPayments || 0} • Rapid repeats: {(riskChecks.rapidRepeatSignals || []).length}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                Avg fulfillment: {Number(slaDashboard.avgFulfillmentMins || 0).toFixed(1)} mins • Pending over SLA: {slaDashboard.pendingOverSla || 0}
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Multi-Branch View
              </Text>
              {(multiBranch.branches || []).map((branch) => (
                <Text key={branch.tenantId} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {branch.branchName}: {branch.orderCount} orders • {branch.productCount} products • {currency} {Number(branch.sales || 0).toLocaleString()}
                </Text>
              ))}
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  Smart Notifications
                </Text>
                <TouchableOpacity
                  onPress={() => smartAlertMutation.mutate()}
                  disabled={smartAlertMutation.isPending}
                  style={{
                    borderRadius: 10,
                    backgroundColor: theme.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    opacity: smartAlertMutation.isPending ? 0.7 : 1,
                  }}
                >
                  <BellRing color="#FFF" size={14} />
                  <Text style={{ color: "#FFF", marginLeft: 6, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                    {smartAlertMutation.isPending ? "Running..." : "Run Alerts"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                Low stock {smartNotifications?.counts?.lowStock || 0} • Expiring {smartNotifications?.counts?.expiringSoon || 0} • Spikes {smartNotifications?.counts?.demandSpikes || 0}
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Top Sold Products
              </Text>
              <View style={{ marginTop: 8 }}>
                {topSoldProducts.length ? (
                  topSoldProducts.map((item) => (
                    <View
                      key={`${item.productId}-${item.productName}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
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
                      <Text style={{ flex: 1, fontSize: 12, color: theme.text }} numberOfLines={1}>
                        {item.productName || "Product"}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Qty {item.quantity || 0}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>No sales data for selected range.</Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
