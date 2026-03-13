import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Video, Download } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { shareCsv } from "@/utils/csvExport";
import { exportReceipt } from "@/utils/receiptExport";

export default function MedicVideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { formatDateTime } = useI18n();
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    type: "VIDEO_CALL",
    status: "ALL",
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const {
    currentCall,
    incomingCall,
    isPremium,
    callStatus,
    callDuration,
    endCall,
    answerCall,
    rejectCall,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleHold,
    markCallConnected,
  } = useVideoCall();
  const incomingSessionId =
    typeof params?.incomingSessionId === "string" ? params.incomingSessionId : "";
  const autoAnswer = String(params?.autoAnswer || "") === "1";

  useEffect(() => {
    if (!autoAnswer || !incomingSessionId) return;
    if (currentCall?.sessionId === incomingSessionId) return;
    answerCall(incomingSessionId, {
      participantName:
        typeof params?.participantName === "string" ? params.participantName : undefined,
      participantRole:
        typeof params?.participantRole === "string" ? params.participantRole : undefined,
      participantId:
        typeof params?.participantId === "string" ? params.participantId : undefined,
      type: typeof params?.callType === "string" ? params.callType : undefined,
      mode: typeof params?.mode === "string" ? params.mode : undefined,
    });
  }, [
    autoAnswer,
    incomingSessionId,
    answerCall,
    currentCall?.sessionId,
    params?.participantName,
    params?.participantRole,
    params?.participantId,
    params?.callType,
    params?.mode,
  ]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(medic)");
  };

  const historyQuery = useQuery({
    queryKey: ["video-call-history", "medic"],
    queryFn: () => apiClient.getVideoCallHistory(),
  });
  const paymentQuery = useQuery({
    queryKey: ["video-call-payments", "medic"],
    queryFn: () =>
      apiClient.getPaymentHistory({
        start: filters.start || undefined,
        end: filters.end || undefined,
        type: filters.type === "ALL" ? undefined : filters.type,
        status: filters.status === "ALL" ? undefined : filters.status,
      }),
  });
  const callHistory = historyQuery.data?.calls || [];
  const paymentHistory = (paymentQuery.data || []).filter(
    (item) => item.type === "VIDEO_CALL",
  );

  const statusColor = (status) => {
    const value = String(status || "").toUpperCase();
    if (value === "PAID") return theme.success;
    if (value === "PENDING") return theme.warning;
    if (value === "FAILED") return theme.error;
    if (value === "CANCELED") return theme.textTertiary;
    return theme.textSecondary;
  };

  const downloadReceipt = async (payment) => {
    await exportReceipt({
      payment,
      payer: { email: payment.payerEmail },
      recipient: { role: payment.recipientRole },
    });
  };

  const exportCallsAndReceipts = async () => {
    const rows = [
      ...callHistory.map((call) => [
        "CALL",
        call.id,
        "",
        "",
        call.status,
        call.callType,
        "",
        call.createdAt,
      ]),
      ...paymentHistory.map((payment) => [
        "RECEIPT",
        payment.id,
        payment.amount,
        payment.method,
        payment.status,
        payment.description || payment.type || "Payment",
        payment.minutes || "",
        payment.createdAt,
      ]),
    ];
    if (rows.length === 0) return;
    await shareCsv({
      filename: "calls-and-receipts.csv",
      headers: [
        "Kind",
        "ID",
        "Amount",
        "Method",
        "Status",
        "Description",
        "Minutes",
        "Created At",
      ],
      rows,
      dialogTitle: "Export Calls & Receipts",
    });
  };

  const exportAllReceipts = async () => {
    if (paymentHistory.length === 0) return;
    await shareCsv({
      filename: "receipts-all.csv",
      headers: [
        "Receipt ID",
        "Amount",
        "Method",
        "Status",
        "Description",
        "Minutes",
        "Created At",
      ],
      rows: paymentHistory.map((payment) => [
        payment.id,
        payment.amount,
        payment.method,
        payment.status,
        payment.description || payment.type || "Payment",
        payment.minutes || "",
        payment.createdAt,
      ]),
      dialogTitle: "Export Receipts",
    });
  };

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFilters((prev) => ({
      ...prev,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    }));
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Video Call
          </Text>
        </View>

        <View
          style={{
            marginHorizontal: 24,
            marginBottom: 16,
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Video color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Start calls from Sessions or Patients.
            </Text>
          </View>
          {!isPremium && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Premium feature: KES 100 per 30 minutes.
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Call History
          </Text>
          {callHistory.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              No calls yet.
            </Text>
          ) : (
            callHistory.slice(0, 5).map((call) => (
              <View
                key={call.id}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    {call.callType || "call"}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      backgroundColor: `${statusColor(call.status)}20`,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: statusColor(call.status) }}>
                      {call.status || "ACTIVE"}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  {formatDateTime ? formatDateTime(call.createdAt) : call.createdAt}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 16, paddingBottom: 24 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Payment Receipts
          </Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Date Range
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.surface,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => setShowRangeModal(true)}
            >
              <Text style={{ color: theme.text }}>
                {filters.start && filters.end
                  ? `${filters.start} → ${filters.end}`
                  : "Select date range"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {["ALL", "VIDEO_CALL", "PAYMENT", "SUBSCRIPTION", "TRANSFER"].map((type) => (
              <TouchableOpacity
                key={type}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor:
                    filters.type === type ? `${theme.primary}20` : theme.surface,
                  borderWidth: 1,
                  borderColor: filters.type === type ? theme.primary : theme.border,
                }}
                onPress={() => setFilters((prev) => ({ ...prev, type }))}
              >
                <Text style={{ fontSize: 11, color: filters.type === type ? theme.primary : theme.textSecondary }}>
                  {type.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {["ALL", "PAID", "PENDING", "FAILED", "CANCELED"].map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor:
                    filters.status === status ? `${theme.primary}20` : theme.surface,
                  borderWidth: 1,
                  borderColor: filters.status === status ? theme.primary : theme.border,
                }}
                onPress={() => setFilters((prev) => ({ ...prev, status }))}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: filters.status === status ? theme.primary : theme.textSecondary,
                  }}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {paymentHistory.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              No payments yet.
            </Text>
          ) : (
            <>
              <TouchableOpacity
                style={{
                  alignSelf: "flex-start",
                  marginTop: 8,
                  marginBottom: 4,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={exportAllReceipts}
              >
                <Download color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  Export all receipts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  alignSelf: "flex-start",
                  marginTop: 4,
                  marginBottom: 4,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={exportCallsAndReceipts}
              >
                <Download color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  Export calls + receipts
                </Text>
              </TouchableOpacity>
              {paymentHistory.slice(0, 5).map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: theme.text }}>
                      KES {payment.amount} • {payment.method}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: `${statusColor(payment.status)}20`,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: statusColor(payment.status) }}>
                        {payment.status || "PENDING"}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                    {payment.description || payment.type || "Payment"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                    {formatDateTime ? formatDateTime(payment.createdAt) : payment.createdAt}
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
                    onPress={() => downloadReceipt(payment)}
                  >
                    <Download color={theme.iconColor} size={14} />
                    <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                      Download Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={filters.start ? new Date(filters.start) : new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) {
                setFilters((prev) => ({
                  ...prev,
                  start: date.toISOString().slice(0, 10),
                }));
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={filters.end ? new Date(filters.end) : new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) {
                setFilters((prev) => ({
                  ...prev,
                  end: date.toISOString().slice(0, 10),
                }));
              }
            }}
          />
        )}

        <Modal visible={showRangeModal} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Select Date Range
              </Text>

              <View style={{ marginTop: 12 }}>
                {Platform.OS === "web" ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={filters.start}
                      onChangeText={(value) =>
                        setFilters((prev) => ({ ...prev, start: value }))
                      }
                      placeholder="Start"
                      placeholderTextColor={theme.textSecondary}
                      style={{
                        flex: 1,
                        backgroundColor: theme.surface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: theme.text,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      type="date"
                    />
                    <TextInput
                      value={filters.end}
                      onChangeText={(value) => setFilters((prev) => ({ ...prev, end: value }))}
                      placeholder="End"
                      placeholderTextColor={theme.textSecondary}
                      style={{
                        flex: 1,
                        backgroundColor: theme.surface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: theme.text,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      type="date"
                    />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.surface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text style={{ color: theme.text }}>
                        {filters.start || "Start"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.surface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text style={{ color: theme.text }}>
                        {filters.end || "End"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {[
                  { label: "Last 7 days", value: 7 },
                  { label: "Last 30 days", value: 30 },
                  { label: "Last 90 days", value: 90 },
                  { label: "YTD", value: "YTD" },
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => {
                      if (preset.value === "YTD") {
                        const end = new Date();
                        const start = new Date(end.getFullYear(), 0, 1);
                        setFilters((prev) => ({
                          ...prev,
                          start: start.toISOString().slice(0, 10),
                          end: end.toISOString().slice(0, 10),
                        }));
                      } else {
                        applyPreset(preset.value);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={() => setShowRangeModal(false)}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={() => setShowRangeModal(false)}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12 }}>
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
}
