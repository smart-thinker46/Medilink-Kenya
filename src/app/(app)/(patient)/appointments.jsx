import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  MessageCircle,
  MoreVertical,
  Plus,
  Filter,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import apiClient from "@/utils/api";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import LocationPreview from "@/components/LocationPreview";
import { getDistanceKm } from "@/utils/locationHelpers";

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, refreshInterval, batterySaver } = useAppTheme();
  const queryClient = useQueryClient();
  const { profile } = usePatientProfile();
  const completion = getProfileCompletion(profile);
  const isProfileComplete = completion.percent >= 99;

  // Video call integration
  const {
    currentCall,
    incomingCall,
    makeMedicalCall,
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

  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // Handle video call initiation
  const handleStartVideoCall = async (appointment, mode = "video") => {
    try {
      await makeMedicalCall(
        appointment.medicId || appointment.id,
        appointment.id,
        { mode },
      );
    } catch (error) {
      console.error("Failed to start video call:", error);
    }
  };

  const promptCallMode = (appointment) => {
    Alert.alert("Start Call", "Choose call type", [
      {
        text: "Audio",
        onPress: () => handleStartVideoCall(appointment, "audio"),
      },
      {
        text: "Video",
        onPress: () => handleStartVideoCall(appointment, "video"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const tabs = [
    { id: "upcoming", title: "Upcoming" },
    { id: "past", title: "Past" },
    { id: "cancelled", title: "Cancelled" },
  ];

  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => apiClient.getAppointments(),
    refetchInterval: batterySaver ? false : refreshInterval,
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.updateAppointment(id, { status: "cancelled", cancelReason: reason }),
    onSuccess: () => {
      setCancelTarget(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      console.error("Cancel appointment failed", error);
    },
  });
  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const linkedLocationsQuery = useQuery({
    queryKey: ["linked-locations"],
    queryFn: () => apiClient.getLinkedLocations(),
  });

  const fallbackAppointments = [
    {
      id: "1",
      doctorName: "Dr. Sarah Johnson",
      specialization: "Cardiology",
      date: "Today",
      time: "2:30 PM",
      type: "consultation",
      mode: "video",
      status: "confirmed",
      hospital: "Nairobi Hospital",
      fee: 3500,
    },
  ];

  const allAppointments =
    appointmentsQuery.data?.items || appointmentsQuery.data || fallbackAppointments;

  const linkedLocations = linkedLocationsQuery.data || [];
  const linkedMap = linkedLocations.reduce((acc, item) => {
    acc[item.id] = item.location;
    return acc;
  }, {});
  const myLocation = myLocationQuery.data?.location || null;

  const sortByDistance = (list) => {
    if (!myLocation) return list;
    return [...list].sort((a, b) => {
      const aLoc = linkedMap[a.medicId || a.medic_id || a.id];
      const bLoc = linkedMap[b.medicId || b.medic_id || b.id];
      const aDist = getDistanceKm(myLocation, aLoc);
      const bDist = getDistanceKm(myLocation, bLoc);
      if (aDist == null && bDist == null) return 0;
      if (aDist == null) return 1;
      if (bDist == null) return -1;
      return aDist - bDist;
    });
  };

  const appointments = {
    upcoming: sortByDistance(
      allAppointments.filter(
        (appointment) =>
          appointment.status === "confirmed" ||
          appointment.status === "pending" ||
          appointment.status === "rescheduled" ||
          appointment.status === "access_requested",
      ),
    ),
    past: sortByDistance(
      allAppointments.filter(
        (appointment) => appointment.status === "completed",
      ),
    ),
    cancelled: sortByDistance(
      allAppointments.filter(
        (appointment) => appointment.status === "cancelled",
      ),
    ),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return theme.success;
      case "pending":
        return theme.warning;
      case "access_requested":
        return theme.warning;
      case "rescheduled":
        return theme.warning;
      case "cancelled":
        return theme.error;
      case "completed":
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case "video":
        return Video;
      case "phone":
        return Phone;
      default:
        return MapPin;
    }
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString();
  };

  const renderAppointmentCard = ({ item, index }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "timing",
        duration: 600,
        delay: index * 100,
      }}
      style={{ marginBottom: 16 }}
    >
      <TouchableOpacity
        style={{
          backgroundColor: theme.card,
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
        activeOpacity={0.8}
        onPress={() =>
          router.push(`/(app)/(shared)/appointment-details/${item.id}`)
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Nunito_600SemiBold",
                color: theme.text,
                marginBottom: 4,
              }}
            >
              {item.doctorName}
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginBottom: 8,
              }}
            >
              {item.specialization} • {item.type}
            </Text>

            <View
              style={{
                backgroundColor: `${getStatusColor(item.status)}20`,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 4,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: getStatusColor(item.status),
                  textTransform: "capitalize",
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MoreVertical color={theme.iconColor} size={16} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Calendar color={theme.primary} size={16} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_500Medium",
              color: theme.text,
              marginLeft: 8,
              marginRight: 16,
            }}
          >
            {item.date}
          </Text>

          <Clock color={theme.primary} size={16} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_500Medium",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            {item.time}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          {React.createElement(getModeIcon(item.mode), {
            color: theme.accent,
            size: 16,
          })}
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              marginLeft: 8,
              marginRight: 16,
              textTransform: "capitalize",
            }}
          >
            {item.mode === "in-person" ? item.hospital : `${item.mode} call`}
          </Text>

          {myLocation && linkedMap[item.medicId || item.medic_id || item.id] ? (
            <View
              style={{
                marginLeft: 12,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                {getDistanceKm(
                  myLocation,
                  linkedMap[item.medicId || item.medic_id || item.id],
                )?.toFixed(1)}{" "}
                km
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.success,
              marginLeft: "auto",
            }}
          >
            KES {formatMoney(item.fee ?? item.amount ?? item.price)}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: `${theme.primary}12`,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            marginBottom: 8,
          }}
          onPress={() =>
            router.push(`/(app)/(shared)/appointment-details/${item.id}`)
          }
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.primary,
            }}
          >
            View Details
          </Text>
        </TouchableOpacity>

        {/* Actions */}
        {item.status === "access_requested" && activeTab === "upcoming" && (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${theme.success}18`,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
              onPress={() =>
                apiClient
                  .updateAppointment(item.id, { status: "confirmed" })
                  .then(() => queryClient.invalidateQueries({ queryKey: ["appointments"] }))
                  .catch((error) => console.error("Confirm access failed", error))
              }
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.success,
                }}
              >
                Approve Access
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${theme.error}18`,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
              onPress={() =>
                apiClient
                  .updateAppointment(item.id, {
                    status: "cancelled",
                    cancelReason: "Access denied by patient.",
                  })
                  .then(() => queryClient.invalidateQueries({ queryKey: ["appointments"] }))
                  .catch((error) => console.error("Reject access failed", error))
              }
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.error,
                }}
              >
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === "confirmed" && activeTab === "upcoming" && (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.8}
              onPress={() => {
                const targetId = item.medicId || item.medic_id;
                if (!targetId) return;
                router.push(`/(app)/(patient)/chat?userId=${targetId}`);
              }}
            >
              <MessageCircle color={theme.textSecondary} size={16} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                  marginLeft: 8,
                }}
              >
                Message
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/location",
                  params: { targetId: item.medicId || item.medic_id || item.id, title: "Medic Location" },
                })
              }
            >
              <MapPin color={theme.textSecondary} size={16} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                  marginLeft: 8,
                }}
              >
                View Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${theme.primary}20`,
                borderRadius: 12,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.8}
              onPress={() => {
                if (item.mode === "video") {
                  promptCallMode(item);
                } else {
                  // Handle directions for in-person appointments
                  // You can integrate with maps here
                }
              }}
            >
              {React.createElement(getModeIcon(item.mode), {
                color: theme.primary,
                size: 16,
              })}
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.primary,
                  marginLeft: 8,
                }}
              >
                {item.mode === "video" ? "Join Call" : "Get Directions"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {item.medicId || item.medic_id ? (
          <LocationPreview
            targetId={item.medicId || item.medic_id}
            theme={theme}
            isDark={isDark}
            height={80}
          />
        ) : null}

        {["pending", "confirmed", "rescheduled"].includes(String(item.status)) && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${theme.warning}20`,
                borderRadius: 12,
                paddingVertical: 10,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() =>
                router.push(
                  `/(app)/(patient)/book-appointment?appointmentId=${item.id}&medicId=${
                    item.medicId || item.medic_id || ""
                  }&reschedule=1`,
                )
              }
            >
              <Calendar color={theme.warning} size={16} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.warning,
                  marginLeft: 8,
                }}
              >
                Reschedule
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${theme.error}20`,
                borderRadius: 12,
                paddingVertical: 10,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => {
                setCancelTarget(item);
                setCancelReason("");
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.error,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
              activeOpacity={0.8}
            >
              <ArrowLeft color={theme.text} size={20} />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
              }}
            >
              My Appointments
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Filter color={theme.iconColor} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? theme.primary : theme.surface,
                  borderRadius: 25,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      activeTab === tab.id ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Appointments List */}
        <FlatList
          data={appointments[activeTab]}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 600 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 60,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Calendar color={theme.iconColor} size={32} />
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Nunito_600SemiBold",
                  color: theme.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No {activeTab} appointments
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                  paddingHorizontal: 40,
                }}
              >
                {activeTab === "upcoming"
                  ? "Book your first appointment to get started"
                  : `You don't have any ${activeTab} appointments`}
              </Text>
            </MotiView>
          )}
        />

        <Modal
          visible={Boolean(cancelTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setCancelTarget(null);
            setCancelReason("");
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                Cancel Appointment
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginTop: 6,
                  marginBottom: 12,
                }}
              >
                Please share a reason for cancelling this appointment.
              </Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Reason for cancellation"
                placeholderTextColor={theme.textSecondary}
                style={{
                  minHeight: 80,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                }}
                multiline
              />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setCancelTarget(null);
                    setCancelReason("");
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: cancelReason.trim() ? theme.error : theme.surface,
                    borderWidth: 1,
                    borderColor: cancelReason.trim() ? theme.error : theme.border,
                    alignItems: "center",
                  }}
                  disabled={!cancelReason.trim() || cancelMutation.isLoading}
                  onPress={() => {
                    if (!cancelTarget?.id) return;
                    cancelMutation.mutate({
                      id: cancelTarget.id,
                      reason: cancelReason.trim(),
                    });
                  }}
                >
                  <Text
                    style={{
                      color: cancelReason.trim() ? "#FFFFFF" : theme.textSecondary,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Confirm Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Floating Action Button */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            right: 24,
          }}
        >
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isProfileComplete ? theme.primary : theme.surface,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={() => {
              if (!isProfileComplete) {
                return;
              }
              router.push("/(app)/(patient)/book-appointment");
            }}
            activeOpacity={0.8}
          >
            <Plus color={isProfileComplete ? "#FFFFFF" : theme.textSecondary} size={24} />
          </TouchableOpacity>
        </View>

      </View>
    </ScreenLayout>
  );
}
