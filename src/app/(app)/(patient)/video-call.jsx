import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Video, Phone, Download } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { shareCsv } from "@/utils/csvExport";
import { exportReceipt } from "@/utils/receiptExport";

export default function VideoCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { formatDateTime } = useI18n();
  const params = useLocalSearchParams();
  const medicId = params?.medicId || "";
  const incomingSessionId =
    typeof params?.incomingSessionId === "string" ? params.incomingSessionId : "";
  const autoAnswer = String(params?.autoAnswer || "") === "1";
  const [minutes, setMinutes] = useState(30);
  const [callMode, setCallMode] = useState("video");
  const [currency, setCurrency] = useState("KES");
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
    makeMedicalCall,
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

  const paymentMethod = "intasend";
  const ratesQuery = useQuery({
    queryKey: ["payment-rates"],
    queryFn: () => apiClient.getPaymentRates(),
  });
  const usdKesRate = Number(ratesQuery.data?.USD_KES || 150);

  const historyQuery = useQuery({
    queryKey: ["video-call-history", "patient"],
    queryFn: () => apiClient.getVideoCallHistory(),
  });
  const paymentQuery = useQuery({
    queryKey: ["video-call-payments", "patient"],
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(patient)");
  };

  const handleStartCall = () => {
    if (!medicId) return;
    const baseKes = Math.ceil(minutes / 30) * 100;
    const amount =
      currency === "USD"
        ? Number((baseKes / usdKesRate).toFixed(2))
        : baseKes;
    makeMedicalCall(medicId, null, {
      minutes,
      paymentMethod,
      currency,
      amount,
      mode: callMode,
    }).catch(() => {});
  };

  const statusLabel = () => {
    switch (callStatus) {
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "incoming":
        return "Incoming call...";
      case "active":
        return "In call";
      default:
        return "Ready to call";
    }
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
            Video Consultation
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
              {statusLabel()}
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
              Premium feature: {currency} {currency === "USD" ? (100 / usdKesRate).toFixed(2) : 100} per 30 minutes.
            </Text>
          )}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Call Duration
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[30, 60, 90].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor:
                      minutes === value ? `${theme.primary}20` : theme.surface,
                    borderWidth: 1,
                    borderColor: minutes === value ? theme.primary : theme.border,
                  }}
                  onPress={() => setMinutes(value)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: minutes === value ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {value} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Call Type
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor:
                    callMode === "video" ? `${theme.primary}20` : theme.surface,
                  borderWidth: 1,
                  borderColor: callMode === "video" ? theme.primary : theme.border,
                }}
                onPress={() => setCallMode("video")}
              >
                <Video color={callMode === "video" ? theme.primary : theme.iconColor} size={14} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: callMode === "video" ? theme.primary : theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor:
                    callMode === "audio" ? `${theme.primary}20` : theme.surface,
                  borderWidth: 1,
                  borderColor: callMode === "audio" ? theme.primary : theme.border,
                }}
                onPress={() => setCallMode("audio")}
              >
                <Phone color={callMode === "audio" ? theme.primary : theme.iconColor} size={14} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: callMode === "audio" ? theme.primary : theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  Audio
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isPremium && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Payment will be processed via IntaSend.
              </Text>
            </View>
          )}
          {!isPremium && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                Currency
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["KES", "USD"].map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor:
                        currency === code ? `${theme.primary}20` : theme.surface,
                      borderWidth: 1,
                      borderColor: currency === code ? theme.primary : theme.border,
                    }}
                    onPress={() => setCurrency(code)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: currency === code ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {currency === "USD" && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                  IntaSend checkout will use 1 USD ≈ {usdKesRate} KES.
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              marginTop: 8,
            }}
            onPress={handleStartCall}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
              }}
            >
              Start Call
            </Text>
          </TouchableOpacity>
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
      </View>
    </ScreenLayout>
  );
}
