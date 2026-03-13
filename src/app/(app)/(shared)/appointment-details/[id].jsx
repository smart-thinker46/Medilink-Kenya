import React, { useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, MessageCircle } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";

export default function AppointmentDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();

  const appointmentId = useMemo(() => {
    const raw = params?.id || params?.appointmentId || params?.appointment_id;
    return String(raw || "").trim();
  }, [params]);

  const role = String(auth?.user?.role || "").toUpperCase();

  const appointmentQuery = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const items = await apiClient.getAppointments();
      const list = items?.items || items || [];
      return list.find((item) => String(item.id) === String(appointmentId)) || null;
    },
    enabled: Boolean(appointmentId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const appointment = appointmentQuery.data;

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString();
  };

  const handleCancel = () => {
    if (!appointmentId) return;
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this appointment?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await updateMutation.mutateAsync({
              id: appointmentId,
              payload: { status: "cancelled", cancelReason: "Cancelled by patient" },
            });
            showToast("Appointment cancelled.", "success");
          } catch (error) {
            showToast(error?.message || "Failed to cancel appointment.", "error");
          }
        },
      },
    ]);
  };

  const handleAccept = async () => {
    if (!appointmentId) return;
    try {
      await updateMutation.mutateAsync({
        id: appointmentId,
        payload: { status: "confirmed" },
      });
      showToast("Appointment confirmed.", "success");
    } catch (error) {
      showToast(error?.message || "Failed to confirm appointment.", "error");
    }
  };

  const handleReject = async () => {
    if (!appointmentId) return;
    try {
      await updateMutation.mutateAsync({
        id: appointmentId,
        payload: { status: "cancelled", cancelReason: "Rejected by provider" },
      });
      showToast("Appointment rejected.", "success");
    } catch (error) {
      showToast(error?.message || "Failed to reject appointment.", "error");
    }
  };

  const handleChat = () => {
    const targetUserId =
      role === "PATIENT" ? appointment?.medicId : appointment?.patientId;
    if (!targetUserId) {
      showToast("Chat user not available.", "warning");
      return;
    }
    const roleChatRoute = {
      PATIENT: "/(app)/(patient)/chat",
      MEDIC: "/(app)/(medic)/chat",
      HOSPITAL_ADMIN: "/(app)/(hospital)/chat",
      PHARMACY_ADMIN: "/(app)/(pharmacy)/chat",
      SUPER_ADMIN: "/(app)/(admin)/chat",
    };
    const route = roleChatRoute[role] || "/(app)/(shared)/conversations";
    router.push(`${route}?userId=${targetUserId}`);
  };

  const showProviderActions =
    role === "MEDIC" || role === "HOSPITAL_ADMIN" || role === "SUPER_ADMIN";
  const status = String(appointment?.status || "").toLowerCase();
  const canApprove = status === "pending" || status === "rescheduled";

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Appointment Details
          </Text>
        </View>

        {appointmentQuery.isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : !appointment ? (
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
            }}
          >
            Appointment not found.
          </Text>
        ) : (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              {appointment.doctorName || appointment.patientName || "Appointment"}
            </Text>

            {appointment.specialization ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                {appointment.specialization}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Calendar color={theme.textSecondary} size={16} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                {appointment.date || "--"} {appointment.time || ""}
              </Text>
            </View>

            {appointment.treatmentLocation ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MapPin color={theme.textSecondary} size={16} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                  }}
                >
                  {appointment.treatmentLocation}
                </Text>
              </View>
            ) : null}

            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Status: {String(appointment.status || "").toUpperCase()}
            </Text>

            {appointment.fee ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Fee: KES {formatMoney(appointment.fee)}
              </Text>
            ) : null}

            {appointment.reason ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Reason: {appointment.reason}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
                onPress={handleChat}
              >
                <MessageCircle color={theme.textSecondary} size={16} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  Message
                </Text>
              </TouchableOpacity>

              {role === "PATIENT" && appointment.status !== "cancelled" ? (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: `${theme.warning}20`,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() =>
                    router.push(
                      `/(app)/(patient)/book-appointment?appointmentId=${appointment.id}&medicId=${
                        appointment.medicId || ""
                      }&reschedule=1`,
                    )
                  }
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.warning,
                    }}
                  >
                    Reschedule
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {role === "PATIENT" && appointment.status !== "cancelled" ? (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: `${theme.error}20`,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={handleCancel}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.error,
                  }}
                >
                  Cancel Appointment
                </Text>
              </TouchableOpacity>
            ) : null}

            {showProviderActions && canApprove ? (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: `${theme.primary}20`,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={handleAccept}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.primary,
                    }}
                  >
                    Accept
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: `${theme.error}20`,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={handleReject}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.error,
                    }}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
