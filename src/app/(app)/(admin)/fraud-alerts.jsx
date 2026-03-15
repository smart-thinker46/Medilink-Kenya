import React from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { AlertTriangle, ShieldAlert, User, FileText, Ban, RefreshCcw, Search } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const SEVERITY_OPTIONS = [
  { label: "All", value: "" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const normalizeSeverity = (value) => String(value || "MEDIUM").trim().toUpperCase();

export default function AdminFraudAlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const alertsQuery = useQuery({
    queryKey: ["admin-fraud-alerts", search, page],
    queryFn: () =>
      apiClient.adminGetAuditLogs({
        action: "FRAUD_",
        search: search || undefined,
        page,
        pageSize,
      }),
  });

  const createCaseMutation = useMutation({
    mutationFn: (payload) => apiClient.adminCreateFraudCase(payload),
    onSuccess: () => {
      showToast("Fraud case created.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-control-center"] });
    },
    onError: (error) => showToast(error.message || "Failed to create fraud case.", "error"),
  });

  const suspendUserMutation = useMutation({
    mutationFn: (userId) => apiClient.adminUpdateUser(userId, { status: "suspended" }),
    onSuccess: () => showToast("User suspended.", "success"),
    onError: (error) => showToast(error.message || "Failed to suspend user.", "error"),
  });

  const logs = alertsQuery.data?.items || [];
  const total = alertsQuery.data?.total || 0;

  const alerts = React.useMemo(
    () =>
      logs.map((item) => {
        const rawDetails = item?.details;
        const details =
          rawDetails && typeof rawDetails === "object"
            ? rawDetails
            : {
                message: typeof rawDetails === "string" ? rawDetails : "",
              };
        const severity = normalizeSeverity(details?.severity || "MEDIUM");
        const type = String(details?.type || item?.action || "FRAUD_ALERT").replace("FRAUD_", "");
        const message = details?.message || "Suspicious activity detected.";
        return {
          id: item?.id || `${item?.action}-${item?.createdAt}`,
          severity,
          type,
          message,
          userId: item?.userId || details?.userId || null,
          tenantId: item?.tenantId || details?.tenantId || null,
          ipAddress: item?.ipAddress || null,
          country: details?.country || null,
          createdAt: item?.createdAt || null,
          details,
        };
      }),
    [logs],
  );

  const filteredAlerts = React.useMemo(() => {
    if (!severityFilter) return alerts;
    return alerts.filter((alert) => alert.severity === severityFilter);
  }, [alerts, severityFilter]);

  const severityCounts = React.useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    );
  }, [alerts]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return { bg: `${theme.error}22`, text: theme.error };
      case "HIGH":
        return { bg: `${theme.error}18`, text: theme.error };
      case "MEDIUM":
        return { bg: `${theme.warning}22`, text: theme.warning };
      case "LOW":
        return { bg: `${theme.success}22`, text: theme.success };
      default:
        return { bg: theme.surface, text: theme.textSecondary };
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  };

  const openUser = (userId) => {
    if (!userId) return;
    router.push(`/(app)/(admin)/users?search=${encodeURIComponent(userId)}`);
  };

  const openAuditLog = () => {
    router.push("/(app)/(admin)/audit-logs?action=FRAUD_&title=Fraud%20Alerts");
  };

  const confirmSuspend = (userId) => {
    if (!userId) return;
    Alert.alert(
      "Suspend user",
      "Suspend this user account immediately?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Suspend", style: "destructive", onPress: () => suspendUserMutation.mutate(userId) },
      ],
    );
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Fraud Alerts
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              Live signals requiring admin attention
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => alertsQuery.refetch()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <RefreshCcw color={theme.textSecondary} size={14} />
            <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldAlert color={theme.warning} size={18} />
              <Text style={{ marginLeft: 6, fontSize: 13, color: theme.text }}>Alert Overview</Text>
            </View>
            <TouchableOpacity onPress={openAuditLog}>
              <Text style={{ fontSize: 11, color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
                Open audit log
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
            Total alerts: {total}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {SEVERITY_OPTIONS.filter((option) => option.value).map((option) => {
              const styles = getSeverityStyles(option.value);
              return (
                <View
                  key={option.value}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    backgroundColor: styles.bg,
                  }}
                >
                  <Text style={{ fontSize: 11, color: styles.text }}>
                    {option.label}: {severityCounts[option.value] || 0}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Search color={theme.textSecondary} size={16} />
            <TextInput
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search message, user ID, IP"
              placeholderTextColor={theme.textSecondary}
              style={{
                marginLeft: 8,
                flex: 1,
                color: theme.text,
                fontSize: 13,
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {SEVERITY_OPTIONS.map((option) => {
            const active = severityFilter === option.value;
            const styles = getSeverityStyles(option.value || "MEDIUM");
            return (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  setSeverityFilter(option.value);
                  setPage(1);
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? styles.text : theme.border,
                  backgroundColor: active ? styles.bg : theme.card,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: active ? styles.text : theme.textSecondary,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 6 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 10,
              height: 40,
            }}
          >
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              <Text style={{ color: page <= 1 ? theme.textTertiary : theme.primary }}>Prev</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Page {page} / {totalPages} • 20 per page
            </Text>
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              <Text style={{ color: page >= totalPages ? theme.textTertiary : theme.primary }}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {alertsQuery.isLoading ? (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Loading fraud alerts...</Text>
          </View>
        ) : filteredAlerts.length === 0 ? (
          <View
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>No fraud alerts found.</Text>
          </View>
        ) : (
          filteredAlerts.map((alert, index) => {
            const badge = getSeverityStyles(alert.severity);
            return (
              <MotiView
                key={alert.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 320, delay: index * 40 }}
                style={{
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: badge.bg,
                    }}>
                      <Text style={{ fontSize: 10, color: badge.text, fontFamily: "Inter_600SemiBold" }}>
                        {alert.severity}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>{alert.type}</Text>
                  </View>
                  <AlertTriangle color={badge.text} size={16} />
                </View>

                <Text style={{ fontSize: 13, color: theme.text, marginTop: 8, fontFamily: "Inter_600SemiBold" }}>
                  {alert.message}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                  User: {alert.userId || "Unknown"} • Tenant: {alert.tenantId || "-"}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  IP: {alert.ipAddress || "-"} • Country: {alert.country || "-"}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  {formatTimestamp(alert.createdAt)}
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => openUser(alert.userId)}
                    disabled={!alert.userId}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      opacity: alert.userId ? 1 : 0.5,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <User color={theme.textSecondary} size={14} />
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>View user</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      createCaseMutation.mutate({
                        userId: alert.userId,
                        type: alert.type,
                        severity: alert.severity,
                        details: alert.details,
                      })
                    }
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FileText color={theme.textSecondary} size={14} />
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>Create case</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmSuspend(alert.userId)}
                    disabled={!alert.userId}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.error,
                      backgroundColor: `${theme.error}12`,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      opacity: alert.userId ? 1 : 0.5,
                    }}
                  >
                    <Ban color={theme.error} size={14} />
                    <Text style={{ fontSize: 11, color: theme.error }}>Suspend</Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
