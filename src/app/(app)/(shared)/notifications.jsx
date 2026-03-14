import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { CheckCircle, Phone, PhoneOff, MessageCircle, Calendar, Package } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useNotifications } from "@/utils/useNotifications";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { notifications, markRead, dismissNotification } = useNotifications();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const queryClient = useQueryClient();

  const parseNotificationData = (notification) => {
    const raw = notification?.data;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  };

  const role = String(auth?.user?.role || "").toUpperCase();
  const roleVideoRoute = {
    PATIENT: "/(app)/(patient)/video-call",
    MEDIC: "/(app)/(medic)/video-call",
    HOSPITAL_ADMIN: "/(app)/(hospital)/video-call",
    PHARMACY_ADMIN: "/(app)/(pharmacy)/video-call",
    SUPER_ADMIN: "/(app)/(admin)/video-call",
  };
  const roleChatRoute = {
    PATIENT: "/(app)/(patient)/chat",
    MEDIC: "/(app)/(medic)/chat",
    HOSPITAL_ADMIN: "/(app)/(hospital)/chat",
    PHARMACY_ADMIN: "/(app)/(pharmacy)/chat",
    SUPER_ADMIN: "/(app)/(admin)/chat",
  };
  const buildVideoRoute = (route, data, autoAnswer = false) => {
    const params = new URLSearchParams();
    if (data?.sessionId) params.append("incomingSessionId", String(data.sessionId));
    if (data?.callerId) params.append("participantId", String(data.callerId));
    if (data?.callerName) params.append("participantName", String(data.callerName));
    if (data?.callerRole) params.append("participantRole", String(data.callerRole));
    if (data?.callType) params.append("callType", String(data.callType));
    if (data?.mode) params.append("mode", String(data.mode));
    params.append("autoAnswer", autoAnswer ? "1" : "0");
    const query = params.toString();
    return query ? `${route}?${query}` : route;
  };

  const getOrderId = (notification) => {
    const data = parseNotificationData(notification) || {};
    return String(data.orderId || data.id || notification?.relatedId || "").trim();
  };

  const handleViewOrder = (notification) => {
    const orderId = getOrderId(notification);
    if (!orderId) {
      showToast("Order reference missing.", "warning");
      return;
    }
    if (!["PHARMACY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      showToast("Order view not available for this account.", "warning");
      return;
    }
    markRead(notification.id);
    dismissNotification(notification);
    router.push(`/(app)/(pharmacy)/orders?orderId=${orderId}`);
  };

  const handleAnswerCall = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const sessionId = data.sessionId || notification?.relatedId;
    if (!sessionId) {
      showToast("Call session missing in notification.", "warning");
      return;
    }
    markRead(notification.id);
    dismissNotification(notification);
    showToast("Opening call screen...", "success");
    const route = roleVideoRoute[role] || "/(app)/(shared)/notifications";
    router.push(buildVideoRoute(route, data, true));
  };

  const handleRejectCall = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const sessionId = data.sessionId || notification?.relatedId;
    if (!sessionId) {
      showToast("Call session missing in notification.", "warning");
      return;
    }
    try {
      await apiClient.request(`/video-calls/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify({
          status: "REJECTED",
          ended_by: auth?.user?.id,
        }),
      });
      markRead(notification.id);
      dismissNotification(notification);
      showToast("Call rejected.", "success");
    } catch (error) {
      showToast(error.message || "Failed to reject call.", "error");
    }
  };

  const getSupportRequestId = (notification) => {
    const data = parseNotificationData(notification) || {};
    return String(data.requestId || notification?.relatedId || "").trim();
  };

  const handleAcceptSupportRequest = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const requestId = getSupportRequestId(notification);
    if (!requestId) {
      showToast("Support request id missing.", "warning");
      return;
    }
    try {
      await apiClient.respondSupportChatRequest(requestId, true);
      markRead(notification.id);
      dismissNotification(notification);
      showToast("Support request accepted.", "success");
      const requesterId = String(data.requesterId || "").trim();
      const route = roleChatRoute[role];
      if (route && requesterId) {
        router.push(`${route}?userId=${requesterId}`);
      }
    } catch (error) {
      showToast(error.message || "Failed to accept support request.", "error");
    }
  };

  const handleRejectSupportRequest = async (notification) => {
    const requestId = getSupportRequestId(notification);
    if (!requestId) {
      showToast("Support request id missing.", "warning");
      return;
    }
    try {
      await apiClient.respondSupportChatRequest(requestId, false);
      markRead(notification.id);
      dismissNotification(notification);
      showToast("Support request rejected.", "success");
    } catch (error) {
      showToast(error.message || "Failed to reject support request.", "error");
    }
  };

  const handleOpenAcceptedSupportChat = (notification) => {
    const data = parseNotificationData(notification) || {};
    const adminId = String(data.adminId || "").trim();
    if (!adminId) {
      showToast("Admin information missing.", "warning");
      return;
    }
    const route = roleChatRoute[role];
    if (!route) {
      showToast("Chat route unavailable for this role.", "warning");
      return;
    }
    markRead(notification.id);
    dismissNotification(notification);
    router.push(`${route}?userId=${adminId}`);
  };

  const handleReplyToMessage = (notification) => {
    const data = parseNotificationData(notification) || {};
    const senderId = String(
      data.senderId || data.userId || data.fromId || data.sender_id || "",
    ).trim();
    if (!senderId) {
      showToast("Sender information missing.", "warning");
      return;
    }
    const route = roleChatRoute[role];
    if (!route) {
      showToast("Chat route unavailable for this role.", "warning");
      return;
    }
    markRead(notification.id);
    dismissNotification(notification);
    router.push(`${route}?userId=${senderId}`);
  };

  const handleMarkMessageRead = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const senderId = String(
      data.senderId || data.userId || data.fromId || data.sender_id || "",
    ).trim();
    try {
      if (senderId) {
        await apiClient.markChatRead(senderId);
      }
      markRead(notification.id);
      dismissNotification(notification);
      showToast("Marked as read.", "success");
    } catch (error) {
      showToast(error.message || "Failed to mark as read.", "error");
    }
  };

  const handleViewAppointment = (notification) => {
    const data = parseNotificationData(notification) || {};
    const appointmentId = String(
      data.appointmentId || data.id || notification?.relatedId || "",
    ).trim();
    if (!appointmentId) {
      showToast("Appointment reference missing.", "warning");
      return;
    }
    markRead(notification.id);
    dismissNotification(notification);
    router.push(`/(app)/(shared)/appointment-details/${appointmentId}`);
  };

  const handlePayPaymentRequest = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Payment amount missing.", "warning");
      return;
    }
    const recipientId = String(data.medicId || data.recipientId || "").trim();
    if (!recipientId) {
      showToast("Recipient missing for this payment request.", "warning");
      return;
    }
    try {
      await apiClient.createPayment({
        amount,
        currency: data.currency || "KES",
        type: "SERVICE",
        description: data.description || "Additional charges",
        recipientId,
        recipientRole: "MEDIC",
        requestId: data.requestId || notification?.relatedId || null,
      });
      markRead(notification.id);
      dismissNotification(notification);
      showToast("Payment initiated. Complete checkout.", "success");
    } catch (error) {
      showToast(error.message || "Failed to initiate payment.", "error");
    }
  };

  const getAppointmentId = (notification) => {
    const data = parseNotificationData(notification) || {};
    return String(data.appointmentId || data.id || notification?.relatedId || "").trim();
  };

  const handleApproveAccessRequest = async (notification) => {
    const appointmentId = getAppointmentId(notification);
    if (!appointmentId) {
      showToast("Appointment reference missing.", "warning");
      return;
    }
    try {
      await apiClient.updateAppointment(appointmentId, { status: "confirmed" });
      markRead(notification.id);
      dismissNotification(notification);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("Access approved.", "success");
    } catch (error) {
      showToast(error.message || "Failed to approve access.", "error");
    }
  };

  const handleDenyAccessRequest = async (notification) => {
    const appointmentId = getAppointmentId(notification);
    if (!appointmentId) {
      showToast("Appointment reference missing.", "warning");
      return;
    }
    try {
      await apiClient.updateAppointment(appointmentId, {
        status: "cancelled",
        cancelReason: "Access denied by patient.",
      });
      markRead(notification.id);
      dismissNotification(notification);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("Access denied.", "success");
    } catch (error) {
      showToast(error.message || "Failed to deny access.", "error");
    }
  };

  const getMedicalRecordRequestId = (notification) => {
    const data = parseNotificationData(notification) || {};
    return String(data.requestId || notification?.relatedId || "").trim();
  };

  const handleApproveMedicalRecordAccess = async (notification) => {
    const requestId = getMedicalRecordRequestId(notification);
    if (!requestId) {
      showToast("Access request reference missing.", "warning");
      return;
    }
    try {
      await apiClient.respondMedicalRecordAccessRequest(requestId, true);
      markRead(notification.id);
      dismissNotification(notification);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("Medical record access approved.", "success");
    } catch (error) {
      showToast(error.message || "Failed to approve request.", "error");
    }
  };

  const handleDenyMedicalRecordAccess = async (notification) => {
    const requestId = getMedicalRecordRequestId(notification);
    if (!requestId) {
      showToast("Access request reference missing.", "warning");
      return;
    }
    try {
      await apiClient.respondMedicalRecordAccessRequest(requestId, false);
      markRead(notification.id);
      dismissNotification(notification);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("Medical record access denied.", "success");
    } catch (error) {
      showToast(error.message || "Failed to deny request.", "error");
    }
  };

  const handleViewMedicalRecordRequest = async (notification) => {
    const data = parseNotificationData(notification) || {};
    const patientId = String(data.patientId || "").trim();
    const medicId = String(data.medicId || "").trim();
    const requestId = getMedicalRecordRequestId(notification);
    try {
      const response = await apiClient.getMedicalRecordAccessRequests({
        status: "PENDING",
      });
      const list = response?.items || response || [];
      const match = list.find((item) => String(item?.id || "") === requestId);
      const matchedPatientId =
        String(match?.patientId || patientId || "").trim();
      if (matchedPatientId) {
        router.push(`/(app)/(patient)/medical-history?patientId=${matchedPatientId}`);
        return;
      }
      if (medicId) {
        router.push(`/(app)/(patient)/medical-history?medicId=${medicId}`);
        return;
      }
      showToast("Request details unavailable.", "warning");
    } catch (error) {
      showToast(error.message || "Failed to load request details.", "error");
    }
  };

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
          Notifications
        </Text>

        {notifications.length === 0 ? (
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
              No notifications yet.
            </Text>
          </View>
        ) : (
          notifications.map((notification, index) => (
            <MotiView
              key={notification.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 60 }}
              style={{
                backgroundColor: notification.isRead
                  ? theme.card
                  : `${theme.primary}10`,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
              >
              {(() => {
                const notificationType = String(notification.type || "").toUpperCase();
                const isChatNotification = notificationType === "CHAT";
                const isVideoCall = notificationType === "VIDEO_CALL";
                const isAppointment = notificationType === "APPOINTMENT";
                const isAccessRequest = notificationType === "ACCESS_REQUEST";
                const isOrderActivity =
                  notificationType === "ORDER_ACTIVITY" ||
                  String(notification.title || "").toLowerCase().includes("purchase/sale");
                const isMedicalRecordAccess = notificationType === "MEDICAL_RECORD_ACCESS_REQUEST";
                return (
                  <>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                {notification.title || "Notification"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginTop: 6,
                }}
              >
                {notification.message}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {notification.createdAt || ""}
                </Text>
                {!notification.isRead && !isChatNotification && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: theme.primary,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onPress={() => {
                      markRead(notification.id);
                      showToast("Marked as read.", "success");
                    }}
                  >
                    <CheckCircle color="#FFFFFF" size={14} />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      Mark read
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
              {isChatNotification && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handleReplyToMessage(notification)}
                  >
                    <MessageCircle color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Reply
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      gap: 6,
                    }}
                    onPress={() => handleMarkMessageRead(notification)}
                  >
                    <CheckCircle color={theme.textSecondary} size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: theme.textSecondary }}>
                      Mark read
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isVideoCall && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.success,
                      gap: 6,
                    }}
                    onPress={() => handleAnswerCall(notification)}
                  >
                    <Phone color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Receive
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.error,
                      gap: 6,
                    }}
                    onPress={() => handleRejectCall(notification)}
                  >
                    <PhoneOff color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isAppointment && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handleViewAppointment(notification)}
                  >
                    <Calendar color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      View
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isOrderActivity && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handleViewOrder(notification)}
                  >
                    <Package color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      View Order
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isAccessRequest && role === "PATIENT" && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handleViewAppointment(notification)}
                  >
                    <Calendar color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.success,
                      gap: 6,
                    }}
                    onPress={() => handleApproveAccessRequest(notification)}
                  >
                    <CheckCircle color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.error,
                      gap: 6,
                    }}
                    onPress={() => handleDenyAccessRequest(notification)}
                  >
                    <PhoneOff color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Deny
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isMedicalRecordAccess && role === "PATIENT" && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handleViewMedicalRecordRequest(notification)}
                  >
                    <Calendar color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.success,
                      gap: 6,
                    }}
                    onPress={() => handleApproveMedicalRecordAccess(notification)}
                  >
                    <CheckCircle color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.error,
                      gap: 6,
                    }}
                    onPress={() => handleDenyMedicalRecordAccess(notification)}
                  >
                    <PhoneOff color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Deny
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {String(notification.type || "").toUpperCase() === "PAYMENT_REQUEST" && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      gap: 6,
                    }}
                    onPress={() => handlePayPaymentRequest(notification)}
                  >
                    <Calendar color="#FFFFFF" size={14} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Pay Now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {String(notification.type || "").toUpperCase() === "SUPPORT_CHAT_REQUEST" &&
                role === "SUPER_ADMIN" && (
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: theme.success,
                        gap: 6,
                      }}
                      onPress={() => handleAcceptSupportRequest(notification)}
                    >
                      <Phone color="#FFFFFF" size={14} />
                      <Text
                        style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                      >
                        Accept Chat
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: theme.error,
                        gap: 6,
                      }}
                      onPress={() => handleRejectSupportRequest(notification)}
                    >
                      <PhoneOff color="#FFFFFF" size={14} />
                      <Text
                        style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              {String(notification.type || "").toUpperCase() === "SUPPORT_CHAT_ACCEPTED" &&
                role !== "SUPER_ADMIN" && (
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: theme.primary,
                        gap: 6,
                      }}
                      onPress={() => handleOpenAcceptedSupportChat(notification)}
                    >
                      <MessageCircle color="#FFFFFF" size={14} />
                      <Text
                        style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                      >
                        Open Chat
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                  </>
                );
              })()}
            </MotiView>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
