import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ArrowLeft, Check, X, Calendar, MapPin, Heart } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import LocationPreview from "@/components/LocationPreview";
import { getDistanceKm } from "@/utils/locationHelpers";

export default function HospitalAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const requestsQuery = useQuery({
    queryKey: ["appointments", "requests"],
    queryFn: () => apiClient.getAppointments({ status: "pending" }),
  });
  const requestsRaw = requestsQuery.data?.items || requestsQuery.data || [];
  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const linkedLocationsQuery = useQuery({
    queryKey: ["linked-locations"],
    queryFn: () => apiClient.getLinkedLocations(),
  });
  const linkedLocations = linkedLocationsQuery.data || [];
  const linkedMap = linkedLocations.reduce((acc, item) => {
    acc[item.id] = item.location;
    return acc;
  }, {});
  const myLocation = myLocationQuery.data?.location || null;
  const requests = myLocation
    ? [...requestsRaw].sort((a, b) => {
        const aLoc = linkedMap[a.patientId || a.patient_id];
        const bLoc = linkedMap[b.patientId || b.patient_id];
        const aDist = getDistanceKm(myLocation, aLoc);
        const bDist = getDistanceKm(myLocation, bLoc);
        if (aDist == null && bDist == null) return 0;
        if (aDist == null) return 1;
        if (bDist == null) return -1;
        return aDist - bDist;
      })
    : requestsRaw;

  const handleAction = async (actionName, appointmentId) => {
    if (!isProfileComplete) {
      showToast(
        "Complete your profile to receive patient requests.",
        "warning",
      );
      return;
    }
    try {
      await apiClient.updateAppointment(appointmentId, {
        status: actionName === "Approve" ? "approved" : "declined",
      });
      showToast(`Request ${actionName.toLowerCase()}d.`, "success");
    } catch (error) {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Action failed. Please try again.", "error");
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
            Appointment Requests
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Requests unlock at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <FlatList
          data={requests}
          keyExtractor={(item, index) => item.id || `request-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 80 }}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    marginBottom: 6,
                  }}
                >
                  {item.patientName || item.patient?.name || "Patient Request"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar color={theme.textSecondary} size={14} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  {item.date || "--"} {item.time || ""}
                </Text>
                {myLocation && linkedMap[item.patientId || item.patient_id] ? (
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
                        linkedMap[item.patientId || item.patient_id],
                      )?.toFixed(1)}{" "}
                      km
                    </Text>
                  </View>
                ) : null}
              </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.success}15`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleAction("Approve", item.id)}
                  >
                    <Check color={theme.success} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.success,
                        marginLeft: 6,
                      }}
                    >
                      Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/(shared)/location",
                        params: { targetId: item.patientId || item.patient_id, title: "Patient Location" },
                      })
                    }
                  >
                    <MapPin color={theme.textSecondary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Location
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.primary}12`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: `${theme.primary}40`,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/(shared)/patient-health-hub",
                        params: { patientId: item.patientId || item.patient_id },
                      })
                    }
                  >
                    <Heart color={theme.primary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.primary,
                        marginLeft: 6,
                      }}
                    >
                      Health Hub
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.error}15`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleAction("Decline", item.id)}
                  >
                    <X color={theme.error} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.error,
                        marginLeft: 6,
                      }}
                    >
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.patientId || item.patient_id ? (
                  <LocationPreview
                    targetId={item.patientId || item.patient_id}
                    theme={theme}
                    isDark={isDark}
                    height={80}
                  />
                ) : null}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={() => (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                No appointment requests yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
