import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { Sparkles, Volume2 } from "lucide-react-native";
import Svg, { Circle, G } from "react-native-svg";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const formatMoney = (value = 0, currency = "KES") => {
  const numeric = Number(value || 0);
  return `${currency} ${numeric.toLocaleString()}`;
};

const DonutChart = ({
  title,
  data = [],
  size = 130,
  strokeWidth = 18,
  centerTitle,
  centerSubtitle,
  theme,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  let offset = 0;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
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
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {total > 0 &&
                data.map((item, index) => {
                  const value = Number(item.value || 0);
                  const segment = (value / total) * circumference;
                  const dashoffset = circumference - offset;
                  offset += segment;
                  return (
                    <Circle
                      key={`${item.label}-${index}`}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={`${segment} ${circumference - segment}`}
                      strokeDashoffset={dashoffset}
                      fill="transparent"
                    />
                  );
                })}
            </G>
          </Svg>
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: theme.text, fontFamily: "Nunito_700Bold" }}>
              {centerTitle || total}
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>{centerSubtitle || "Total"}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 6 }}>
        {data.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginRight: 8,
                backgroundColor: item.color,
              }}
            />
            <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>{item.label}</Text>
            <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const HorizontalBars = ({ title, data = [], theme }) => {
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 0);

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
        {title}
      </Text>
      <View style={{ marginTop: 10 }}>
        {data.map((item, index) => {
          const widthPct = max > 0 ? Math.max(4, Math.round((Number(item.value || 0) / max) * 100)) : 0;
          return (
            <View key={`${item.label}-${index}`} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  {item.value}
                </Text>
              </View>
              <View
                style={{
                  marginTop: 6,
                  height: 9,
                  borderRadius: 9,
                  backgroundColor: theme.surface,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${widthPct}%`,
                    backgroundColor: item.color,
                    borderRadius: 9,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const MetricCard = ({ label, value, hint, theme }) => (
  <View
    style={{
      flex: 1,
      minWidth: 150,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
    }}
  >
    <Text style={{ fontSize: 12, color: theme.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: 18, color: theme.text, fontFamily: "Nunito_700Bold", marginTop: 6 }}>
      {value}
    </Text>
    {!!hint && <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>{hint}</Text>}
  </View>
);

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const [aiInsights, setAiInsights] = useState(null);
  const { speak: speakAiText, isSpeaking: aiSpeaking } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiClient.getAdminOverview(),
  });

  const operationsQuery = useQuery({
    queryKey: ["admin-operations"],
    queryFn: () => apiClient.adminGetOperations(),
  });
  const shiftDiagnosticsQuery = useQuery({
    queryKey: ["admin-shift-migration-diagnostics"],
    queryFn: () => apiClient.adminGetShiftMigrationDiagnostics({ limit: 10 }),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: () => apiClient.aiAnalyticsSummary({ timeframe: "current snapshot" }),
    onSuccess: (data) => setAiInsights(data || null),
    onError: (error) => {
      showToast(error.message || "AI summary unavailable.", "error");
    },
  });
  const shiftBackfillMutation = useMutation({
    mutationFn: () => apiClient.adminRunShiftBackfill(),
    onSuccess: (data) => {
      shiftDiagnosticsQuery.refetch();
      showToast(
        `Backfill complete: inserted ${Number(data?.inserted || 0)} shift(s).`,
        "success",
      );
    },
    onError: (error) => {
      showToast(error.message || "Backfill failed.", "error");
    },
  });

  const overview = overviewQuery.data || {};
  const analytics = overview.analytics || {};
  const totals = overview.totals || {};
  const revenue = overview.revenue || {};
  const operations = operationsQuery.data || {};
  const shiftDiagnostics = shiftDiagnosticsQuery.data || {};
  const shiftDiagTotals = shiftDiagnostics.totals || {};
  const shiftDiagSamples = shiftDiagnostics.samples || {};

  const approvals = analytics.approvals || {
    approved: 0,
    nonApproved: 0,
  };
  const onlineStatus = analytics.onlineStatus || {
    online: 0,
    offline: 0,
  };
  const profiles = analytics.profiles || {
    completed: 0,
    incomplete: 0,
  };
  const blocked = analytics.blocked || {
    blocked: 0,
    unblocked: 0,
  };
  const subscriptionStats = analytics.subscriptions || {
    active: totals.subscriptionActive || 0,
    inactive: totals.subscriptionInactive || 0,
    revenue: revenue.subscriptions || 0,
    unpaidUsersCount: 0,
    unpaidAmountEstimate: 0,
    currency: revenue.currency || "KES",
  };

  const shiftStats = useMemo(() => {
    const fallback = analytics.shifts || {
      total: operations?.totals?.shifts || 0,
      completed: operations?.shiftStatuses?.completed || 0,
      pending: operations?.shiftStatuses?.pending || 0,
      cancelled: operations?.shiftStatuses?.cancelled || 0,
    };

    return {
      total: Number(fallback.total || 0),
      completed: Number(fallback.completed || 0),
      pending: Number(fallback.pending || 0),
      cancelled: Number(fallback.cancelled || 0),
    };
  }, [analytics.shifts, operations]);

  const getAnalyticsSpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      String(data?.summary || "").trim(),
      Array.isArray(data?.insights) && data.insights.length
        ? `Insights: ${data.insights.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.alerts) && data.alerts.length
        ? `Alerts: ${data.alerts.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.recommendations) && data.recommendations.length
        ? `Recommendations: ${data.recommendations.slice(0, 4).join(". ")}`
        : "",
    ]
      .filter(Boolean)
      .join(". ");
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
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 14,
          }}
        >
          Analytics
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <MetricCard label="Total Users" value={totals.totalUsers || 0} theme={theme} />
          <MetricCard label="Blocked Users" value={blocked.blocked || 0} theme={theme} />
          <MetricCard
            label="Subscription Revenue"
            value={formatMoney(subscriptionStats.revenue || 0, subscriptionStats.currency || "KES")}
            hint="Paid subscriptions"
            theme={theme}
          />
          <MetricCard
            label="Estimated Unpaid Amount"
            value={formatMoney(
              subscriptionStats.unpaidAmountEstimate || 0,
              subscriptionStats.currency || "KES",
            )}
            hint={`${subscriptionStats.unpaidUsersCount || 0} users unpaid`}
            theme={theme}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Shift Migration Health
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => shiftDiagnosticsQuery.refetch()}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => shiftBackfillMutation.mutate()}
                disabled={shiftBackfillMutation.isLoading}
                style={{
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: theme.primary,
                  opacity: shiftBackfillMutation.isLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 11, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                  {shiftBackfillMutation.isLoading ? "Running..." : "Run Backfill"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {shiftDiagnosticsQuery.isLoading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator color={theme.primary} size="small" />
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Audit Shift Records:{" "}
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  {shiftDiagTotals.auditShiftRecords || 0}
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Shifts Table Records:{" "}
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  {shiftDiagTotals.shiftsTableRecords || 0}
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Migrated From Audit:{" "}
                <Text style={{ color: theme.success, fontFamily: "Inter_600SemiBold" }}>
                  {shiftDiagTotals.migratedFromAudit || 0}
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Missing In Shifts Table:{" "}
                <Text style={{ color: theme.error, fontFamily: "Inter_600SemiBold" }}>
                  {shiftDiagTotals.missingInShiftsTable || 0}
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Invalid Audit Rows:{" "}
                <Text style={{ color: theme.warning, fontFamily: "Inter_600SemiBold" }}>
                  {shiftDiagTotals.invalidAuditRows || 0}
                </Text>
              </Text>

              {(shiftDiagSamples.missingInShiftsTable || []).length > 0 ? (
                <View
                  style={{
                    marginTop: 4,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    Missing Sample IDs
                  </Text>
                  {(shiftDiagSamples.missingInShiftsTable || []).slice(0, 5).map((item) => (
                    <Text key={item.id} style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                      {item.id}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 450 }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <DonutChart
                title="Approved vs Not Approved"
                theme={theme}
                centerTitle={approvals.approved + approvals.nonApproved}
                centerSubtitle="Users"
                data={[
                  { label: "Approved", value: approvals.approved || 0, color: theme.success },
                  { label: "Not Approved", value: approvals.nonApproved || 0, color: theme.warning },
                ]}
              />
            </View>

            <View style={{ flex: 1, minWidth: 280 }}>
              <DonutChart
                title="Online vs Offline"
                theme={theme}
                centerTitle={onlineStatus.online + onlineStatus.offline}
                centerSubtitle="Presence"
                data={[
                  { label: "Online", value: onlineStatus.online || 0, color: "#22C55E" },
                  { label: "Offline", value: onlineStatus.offline || 0, color: theme.textTertiary },
                ]}
              />
            </View>

            <View style={{ flex: 1, minWidth: 280 }}>
              <DonutChart
                title="Profiles Completed"
                theme={theme}
                centerTitle={profiles.completed + profiles.incomplete}
                centerSubtitle="Profiles"
                data={[
                  { label: "Completed", value: profiles.completed || 0, color: theme.primary },
                  { label: "Incomplete", value: profiles.incomplete || 0, color: theme.error },
                ]}
              />
            </View>

            <View style={{ flex: 1, minWidth: 280 }}>
              <DonutChart
                title="Blocked Accounts"
                theme={theme}
                centerTitle={blocked.blocked + blocked.unblocked}
                centerSubtitle="Accounts"
                data={[
                  { label: "Blocked", value: blocked.blocked || 0, color: theme.error },
                  { label: "Active", value: blocked.unblocked || 0, color: theme.success },
                ]}
              />
            </View>
          </View>
        </MotiView>

        <View style={{ marginTop: 14 }}>
          <HorizontalBars
            title="Shift Analysis"
            theme={theme}
            data={[
              { label: "Shifts Made", value: shiftStats.total || 0, color: theme.primary },
              { label: "Completed", value: shiftStats.completed || 0, color: theme.success },
              { label: "Pending", value: shiftStats.pending || 0, color: theme.warning },
              { label: "Cancelled", value: shiftStats.cancelled || 0, color: theme.error },
            ]}
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <DonutChart
            title="Subscription Status"
            theme={theme}
            centerTitle={(subscriptionStats.active || 0) + (subscriptionStats.inactive || 0)}
            centerSubtitle="Subscribers"
            data={[
              { label: "Paid/Active", value: subscriptionStats.active || 0, color: theme.success },
              { label: "Unpaid/Inactive", value: subscriptionStats.inactive || 0, color: theme.warning },
            ]}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginTop: 14,
          }}
        >
          <TouchableOpacity
            onPress={() => aiSummaryMutation.mutate()}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: aiInsights ? 12 : 0,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Sparkles color={theme.primary} size={18} />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginLeft: 8 }}>
                AI Analytics Summary
              </Text>
            </View>
            {aiSummaryMutation.isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={{ fontSize: 12, color: theme.primary }}>Generate</Text>
            )}
          </TouchableOpacity>
          {!!aiInsights?.summary && (
            <View>
              <TouchableOpacity
                onPress={() => speakAiText(getAnalyticsSpeechText(aiInsights))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.surface,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Summary"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>{aiInsights.summary}</Text>
              {Array.isArray(aiInsights.insights) &&
                aiInsights.insights.slice(0, 6).map((line, index) => (
                  <Text key={`insight-${index}`} style={{ fontSize: 12, color: theme.textSecondary, marginTop: 5 }}>
                    • {line}
                  </Text>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
