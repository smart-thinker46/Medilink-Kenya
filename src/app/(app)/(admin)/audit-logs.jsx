import React from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { shareCsv, emailCsv } from "@/utils/csvExport";

export default function AdminAuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");

  const applyPreset = (days) => {
    if (!days) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    const format = (date) => date.toISOString().slice(0, 10);
    setStartDate(format(start));
    setEndDate(format(now));
  };

  const logsQuery = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiClient.adminGetAuditLogs(),
  });
  const reportQuery = useQuery({
    queryKey: ["admin-activity-report"],
    queryFn: () => apiClient.adminGetActivityReport(),
  });
  const logs = logsQuery.data || [];
  const filteredLogs = React.useMemo(() => {
    let list = [...logs];
    if (actionFilter) {
      const needle = actionFilter.toLowerCase();
      list = list.filter((log) => (log.action || "").toLowerCase().includes(needle));
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      list = list.filter((log) => {
        if (!log.createdAt) return false;
        const date = new Date(log.createdAt);
        if (start && date < start) return false;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (date > endOfDay) return false;
        }
        return true;
      });
    }
    return list;
  }, [logs, actionFilter, startDate, endDate]);

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
          Audit Log
        </Text>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TextInput
            placeholder="Filter action"
            placeholderTextColor={theme.textSecondary}
            value={actionFilter}
            onChangeText={setActionFilter}
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

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TextInput
            placeholder="Start date (YYYY-MM-DD)"
            placeholderTextColor={theme.textSecondary}
            value={startDate}
            onChangeText={setStartDate}
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
            onChangeText={setEndDate}
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
            <MotiView
              key={log.id || `${log.action}-${index}`}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 40 }}
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
                Target: {log.targetId || "--"}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                {log.createdAt || ""}
              </Text>
            </MotiView>
          ))
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
            const headers = ["Action", "Target Id", "Created At"];
            const rows = filteredLogs.map((log) => [
              log.action || "",
              log.targetId || "",
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
            const headers = ["Action", "Target Id", "Created At"];
            const rows = filteredLogs.map((log) => [
              log.action || "",
              log.targetId || "",
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
