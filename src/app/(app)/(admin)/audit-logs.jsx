import React from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { shareCsv, emailCsv } from "@/utils/csvExport";

let MotiViewComponent = null;
try {
  // Avoid hard dependency on Reanimated/Moti on web; fall back to plain View.
  MotiViewComponent = require("moti")?.MotiView || null;
} catch {
  MotiViewComponent = null;
}

export default function AdminAuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const initialAction =
    typeof params?.action === "string" ? String(params.action || "").trim() : "";
  const headerTitle =
    typeof params?.title === "string" && params.title.trim()
      ? params.title.trim()
      : "Audit Log";
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState(initialAction);
  const [searchFilter, setSearchFilter] = React.useState("");
  const [resourceFilter, setResourceFilter] = React.useState("");
  const [userIdFilter, setUserIdFilter] = React.useState("");
  const [tenantIdFilter, setTenantIdFilter] = React.useState("");
  const [ipFilter, setIpFilter] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  const applyPreset = (days) => {
    if (!days) {
      setStartDate("");
      setEndDate("");
      setPage(1);
      return;
    }
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    const format = (date) => date.toISOString().slice(0, 10);
    setStartDate(format(start));
    setEndDate(format(now));
    setPage(1);
  };

  const clearFilters = () => {
    setActionFilter("");
    setSearchFilter("");
    setResourceFilter("");
    setUserIdFilter("");
    setTenantIdFilter("");
    setIpFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const confirmAndClear = ({ scope }) => {
    const hasRange = Boolean(startDate || endDate);
    const title = scope === "range" ? "Clear Logs (Date Range)" : "Clear All Logs";
    const rangeHint =
      scope === "range" && hasRange
        ? `\n\nRange: ${startDate || "any"} to ${endDate || "any"}`
        : "";
    const message = `This will permanently delete audit logs on the server.${rangeHint}\n\nThis action will also be recorded as an audit event.`;

    if (scope === "range" && !hasRange) {
      showToast("Set a start or end date first to clear a specific period.", "info");
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "DELETE",
        style: Platform.OS === "ios" ? "destructive" : "destructive",
        onPress: async () => {
          try {
            const params =
              scope === "range"
                ? {
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                  }
                : {};
            const res = await apiClient.adminClearAuditLogs(params, { confirm: "DELETE" });
            const deleted = res?.deleted ?? res?.data?.deleted ?? 0;
            showToast(`Cleared ${Number(deleted)} audit log(s).`, "success");
            setPage(1);
            await queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
          } catch (e) {
            showToast(e?.message || "Failed to clear audit logs.", "error");
          }
        },
      },
    ]);
  };

  const logsQuery = useQuery({
    queryKey: [
      "admin-audit-logs",
      actionFilter,
      searchFilter,
      resourceFilter,
      userIdFilter,
      tenantIdFilter,
      ipFilter,
      startDate,
      endDate,
      page,
    ],
    queryFn: () =>
      apiClient.adminGetAuditLogs({
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        userId: userIdFilter || undefined,
        tenantId: tenantIdFilter || undefined,
        ip: ipFilter || undefined,
        search: searchFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize,
      }),
  });
  const reportQuery = useQuery({
    queryKey: ["admin-activity-report"],
    queryFn: () => apiClient.adminGetActivityReport(),
  });
  const logs = logsQuery.data?.items || [];
  const total = logsQuery.data?.total || 0;
  const canAnimate = Platform.OS !== "web" && typeof MotiViewComponent === "function";
  const LogCard = canAnimate ? MotiViewComponent : View;
  const filteredLogs = React.useMemo(() => {
    let list = [...logs];
    return list;
  }, [logs]);

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
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 16,
          }}
        >
          {headerTitle}
        </Text>

        <TouchableOpacity
          style={{
            marginBottom: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            alignSelf: "flex-start",
          }}
          onPress={() => setShowFilters((value) => !value)}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => confirmAndClear({ scope: "all" })}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.35)",
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.10)" : "rgba(239, 68, 68, 0.08)",
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ef4444" }}>
              Clear All Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmAndClear({ scope: "range" })}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              opacity: startDate || endDate ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Clear Date Range
            </Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 16,
              gap: 12,
            }}
          >
            <TextInput
              placeholder="Filter action"
              placeholderTextColor={theme.textSecondary}
              value={actionFilter}
              onChangeText={(value) => {
                setActionFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <TextInput
              placeholder="Filter resource"
              placeholderTextColor={theme.textSecondary}
              value={resourceFilter}
              onChangeText={(value) => {
                setResourceFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <TextInput
              placeholder="Filter user ID"
              placeholderTextColor={theme.textSecondary}
              value={userIdFilter}
              onChangeText={(value) => {
                setUserIdFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <TextInput
              placeholder="Filter tenant ID"
              placeholderTextColor={theme.textSecondary}
              value={tenantIdFilter}
              onChangeText={(value) => {
                setTenantIdFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <TextInput
              placeholder="Filter IP address"
              placeholderTextColor={theme.textSecondary}
              value={ipFilter}
              onChangeText={(value) => {
                setIpFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <TextInput
              placeholder="Search (user, IP, resource)"
              placeholderTextColor={theme.textSecondary}
              value={searchFilter}
              onChangeText={(value) => {
                setSearchFilter(value);
                setPage(1);
              }}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                color: theme.text,
                fontSize: 12,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput
                placeholder="Start date (YYYY-MM-DD)"
                placeholderTextColor={theme.textSecondary}
                value={startDate}
                onChangeText={(value) => {
                  setStartDate(value);
                  setPage(1);
                }}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
              <TextInput
                placeholder="End date (YYYY-MM-DD)"
                placeholderTextColor={theme.textSecondary}
                value={endDate}
                onChangeText={(value) => {
                  setEndDate(value);
                  setPage(1);
                }}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => {
                  setActionFilter("FRAUD_");
                  setPage(1);
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  Fraud only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => {
                  setActionFilter("");
                  setPage(1);
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  All actions
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={clearFilters}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Last 7 days", value: 7 },
            { label: "Last 30 days", value: 30 },
            { label: "Clear", value: 0 },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => applyPreset(preset.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                }}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredLogs.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              No audit events yet.
            </Text>
          </View>
        ) : (
          filteredLogs.map((log, index) => (
            <LogCard
              key={log.id || `${log.action}-${index}`}
              {...(canAnimate
                ? {
                    from: { opacity: 0, translateY: 10 },
                    animate: { opacity: 1, translateY: 0 },
                    transition: { type: "timing", duration: 400, delay: index * 40 },
                  }
                : {})}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                {log.action || "ACTION"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                User: {log.userName || log.userEmail || log.userId || "--"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Resource: {log.resource || "--"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Target: {log.targetId || "--"}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                IP: {log.ipAddress || "--"}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                {log.createdAt || ""}
              </Text>
            </LogCard>
          ))
        )}

        {total > pageSize && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              disabled={page <= 1}
              style={{
                flex: 1,
                backgroundColor: page <= 1 ? theme.card : theme.surface,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                opacity: page <= 1 ? 0.6 : 1,
              }}
              onPress={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Previous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={page * pageSize >= total}
              style={{
                flex: 1,
                backgroundColor: page * pageSize >= total ? theme.card : theme.surface,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                opacity: page * pageSize >= total ? 0.6 : 1,
              }}
              onPress={() => setPage((prev) => prev + 1)}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
          }}
          onPress={() => {
            const headers = [
              "Action",
              "User",
              "Resource",
              "Target Id",
              "IP",
              "Created At",
            ];
            const rows = filteredLogs.map((log) => [
              log.action || "",
              log.userName || log.userEmail || log.userId || "",
              log.resource || "",
              log.targetId || "",
              log.ipAddress || "",
              log.createdAt || "",
            ]);
            shareCsv({
              filename: "audit-logs.csv",
              headers,
              rows,
              dialogTitle: "Share Audit CSV",
            }).then(({ csv, shared }) => {
              if (!shared) {
                console.log(csv);
                showToast("CSV generated and downloaded.", "info");
              } else {
                showToast("CSV ready to share.", "success");
              }
            });
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            Export Audit CSV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 10,
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => {
            const headers = [
              "Action",
              "User",
              "Resource",
              "Target Id",
              "IP",
              "Created At",
            ];
            const rows = filteredLogs.map((log) => [
              log.action || "",
              log.userName || log.userEmail || log.userId || "",
              log.resource || "",
              log.targetId || "",
              log.ipAddress || "",
              log.createdAt || "",
            ]);
            emailCsv({
              filename: "audit-logs.csv",
              headers,
              rows,
              subject: "Audit Log Export",
              body: "Please find the audit log CSV attached.",
            }).then(({ csv, emailed }) => {
              if (!emailed) {
                console.log(csv);
                showToast("CSV generated in console output.", "info");
              } else {
                showToast("Email draft opened with CSV attached.", "success");
              }
            });
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Email Audit CSV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 10,
            backgroundColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
          }}
          onPress={() => {
            const report = reportQuery.data || {};
            const summary = report.summary || {};
            const operations = report.operations || {};
            const rows = [];
            rows.push(["generatedAt", report.generatedAt || ""]);
            rows.push(["totalAuditEvents", summary.totalAuditEvents || 0]);
            rows.push(["totalNotifications", summary.totalNotifications || 0]);
            rows.push(["totalMessages", summary.totalMessages || 0]);
            rows.push(["totalShifts", summary.totalShifts || 0]);
            rows.push(["totalShiftApplications", summary.totalShiftApplications || 0]);
            rows.push(["totalHires", summary.totalHires || 0]);
            rows.push(["pendingShifts", operations?.shiftStatuses?.pending || 0]);
            rows.push(["completedShifts", operations?.shiftStatuses?.completed || 0]);
            rows.push(["cancelledShifts", operations?.shiftStatuses?.cancelled || 0]);
            rows.push(["hiredShifts", operations?.shiftStatuses?.hired || 0]);
            rows.push(["topMedic", operations?.topMedic?.medicName || ""]);
            rows.push([
              "topMedicTotalPatientHires",
              operations?.topMedic?.totalPatientHires || 0,
            ]);
            shareCsv({
              filename: "activity-report.csv",
              headers: ["metric", "value"],
              rows,
              dialogTitle: "Share Activity Report CSV",
            }).then(({ csv, shared }) => {
              if (!shared) {
                console.log(csv);
                showToast("Activity report CSV generated.", "info");
              } else {
                showToast("Activity report CSV ready to share.", "success");
              }
            });
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            Generate Full Activity Report
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
