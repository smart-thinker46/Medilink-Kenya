import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, PhoneCall, Video } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import VideoCall from "@/components/VideoCall";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCall } from "@/utils/useVideoCall";
import { usePatientProfile } from "@/utils/usePatientProfile";
import apiClient from "@/utils/api";
import {
  getDistanceKm,
  getLocationAddressLabel,
  normalizeLocation,
} from "@/utils/locationHelpers";

const toDialablePhone = (value) => String(value || "").replace(/[^\d+]/g, "");

export default function EmergencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { profile } = usePatientProfile();
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const {
    currentCall,
    incomingCall,
    makeEmergencyCall,
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
  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const medicsQuery = useQuery({
    queryKey: ["medics", "emergency"],
    queryFn: () => apiClient.getMedics({ limit: 100 }),
  });
  const linkedLocationsQuery = useQuery({
    queryKey: ["linked-locations", "emergency"],
    queryFn: () => apiClient.getLinkedLocations(),
  });

  const myLocation = useMemo(
    () => normalizeLocation(myLocationQuery.data?.location),
    [myLocationQuery.data],
  );
  const nearestMedic = useMemo(() => {
    const medics = medicsQuery.data?.items || medicsQuery.data || [];
    return medics
      .map((medic) => {
        const location = normalizeLocation({
          latitude:
            medic?.locationLat ??
            medic?.locationCoordinates?.lat ??
            medic?.location?.lat ??
            medic?.location?.latitude,
          longitude:
            medic?.locationLng ??
            medic?.locationCoordinates?.lng ??
            medic?.location?.lng ??
            medic?.location?.longitude,
          address: medic?.locationAddress || medic?.location || "",
        });
        const phone = toDialablePhone(medic?.phone || medic?.contactPhone || "");
        const distanceKm =
          myLocation && location
            ? getDistanceKm(
                {
                  latitude: Number(myLocation.latitude),
                  longitude: Number(myLocation.longitude),
                },
                {
                  latitude: Number(location.latitude),
                  longitude: Number(location.longitude),
                },
              )
            : null;
        return {
          id: medic.id || medic.medicId,
          name: medic.name || "Medic",
          specialization: medic.specialization || "",
          phone,
          location,
          distanceKm,
        };
      })
      .filter((item) => item.phone)
      .sort((a, b) => {
        const aDist = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
        const bDist = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
        return aDist - bDist;
      })[0];
  }, [medicsQuery.data, myLocation]);
  const nearestHospital = useMemo(() => {
    const linked = linkedLocationsQuery.data || [];
    return linked
      .filter((item) => String(item?.role || "").toUpperCase() === "HOSPITAL_ADMIN")
      .map((hospital) => {
        const location = normalizeLocation(hospital?.location);
        const phone = toDialablePhone(hospital?.phone || hospital?.contactPhone || "");
        const distanceKm =
          myLocation && location
            ? getDistanceKm(
                {
                  latitude: Number(myLocation.latitude),
                  longitude: Number(myLocation.longitude),
                },
                {
                  latitude: Number(location.latitude),
                  longitude: Number(location.longitude),
                },
              )
            : null;
        return {
          id: hospital.id,
          name: hospital.name || "Hospital",
          phone,
          location,
          distanceKm,
        };
      })
      .filter((item) => item.phone && item.location)
      .sort((a, b) => {
        const aDist = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
        const bDist = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
        return aDist - bDist;
      })[0];
  }, [linkedLocationsQuery.data, myLocation]);

  const emergencyContacts = useMemo(() => {
    const contacts = [];
    const seen = new Set();
    const pushUnique = (entry) => {
      if (!entry?.phone) return;
      const dialable = toDialablePhone(entry.phone);
      if (!dialable || seen.has(dialable)) return;
      seen.add(dialable);
      contacts.push({ ...entry, phone: dialable });
    };

    if (nearestMedic) {
      pushUnique({
        id: `nearest-medic-${nearestMedic.id}`,
        title: "Nearest Medic",
        subtitle: [
          nearestMedic.name,
          nearestMedic.specialization,
          Number.isFinite(nearestMedic.distanceKm)
            ? `${nearestMedic.distanceKm.toFixed(1)} km away`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
        phone: nearestMedic.phone,
      });
    }

    if (nearestHospital) {
      pushUnique({
        id: `nearest-hospital-${nearestHospital.id}`,
        title: "Nearest Hospital",
        subtitle: [
          nearestHospital.name,
          Number.isFinite(nearestHospital.distanceKm)
            ? `${nearestHospital.distanceKm.toFixed(1)} km away`
            : null,
          getLocationAddressLabel(nearestHospital.location),
        ]
          .filter(Boolean)
          .join(" • "),
        phone: nearestHospital.phone,
      });
    }

    pushUnique({
      id: "saved-emergency-number",
      title: "Saved Emergency Contact",
      subtitle: profile?.emergencyContactName || "Your saved contact",
      phone: profile?.emergencyContactPhone || "",
    });

    pushUnique({
      id: "kenya-emergency-112",
      title: "National Emergency",
      subtitle: "Kenya emergency line",
      phone: "112",
    });
    pushUnique({
      id: "kenya-emergency-999",
      title: "Police / Ambulance",
      subtitle: "Kenya emergency line",
      phone: "999",
    });

    return contacts;
  }, [nearestHospital, nearestMedic, profile?.emergencyContactName, profile?.emergencyContactPhone]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(patient)");
  };

  const startInAppEmergencyCall = async (mode = "video") => {
    const targetId = nearestHospital?.id || nearestMedic?.id || "hospital-1";
    try {
      await makeEmergencyCall(targetId, { mode });
    } catch (error) {
      Alert.alert("Emergency", "Failed to reach emergency services.");
    }
  };

  const promptEmergencyVideoMode = () => {
    Alert.alert("In-app Emergency Call", "Choose call type", [
      { text: "Audio", onPress: () => startInAppEmergencyCall("audio") },
      { text: "Video", onPress: () => startInAppEmergencyCall("video") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const startEmergencyDial = async (phone) => {
    const dialable = toDialablePhone(phone);
    if (!dialable) {
      Alert.alert("Emergency", "No phone number available for this contact.");
      return;
    }
    const url = `tel:${dialable}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Emergency", "Your device cannot open the phone dialer.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
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
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Emergency
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 20,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Call Emergency Services
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            Start by choosing the closest medic, hospital, or saved emergency number.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.error,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
            onPress={() => setShowEmergencyContacts(true)}
          >
            <PhoneCall color="#FFFFFF" size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
                marginLeft: 8,
              }}
            >
              Start Emergency Call
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
            onPress={promptEmergencyVideoMode}
          >
            <Video color={theme.text} size={16} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              In-app Audio/Video Emergency
            </Text>
          </TouchableOpacity>
        </View>
        {showEmergencyContacts ? (
          <View
            style={{
              marginTop: 14,
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 16,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 2,
              }}
            >
              Tap a number to open dialer
            </Text>
            {myLocationQuery.isLoading || medicsQuery.isLoading || linkedLocationsQuery.isLoading ? (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : emergencyContacts.length ? (
              emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  activeOpacity={0.85}
                  onPress={() => startEmergencyDial(contact.phone)}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {contact.title}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                      }}
                      numberOfLines={2}
                    >
                      {contact.subtitle}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: `${theme.primary}20`,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MapPin size={14} color={theme.primary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_700Bold",
                        color: theme.primary,
                      }}
                    >
                      {contact.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                No emergency contacts available yet. Add an emergency contact on your profile.
              </Text>
            )}
          </View>
        ) : null}
        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
            }}
          >
            If location is set, nearest medic/hospital are prioritized first.
          </Text>
        </View>
        <VideoCall
          isActive={Boolean(currentCall)}
          incomingCall={incomingCall}
          participantName={currentCall?.participantName}
          participantRole={currentCall?.participantRole}
          callMode={currentCall?.mode || "video"}
          callStatus={callStatus}
          callDuration={callDuration}
          callType={currentCall?.type || "emergency"}
          sessionId={currentCall?.sessionId}
          remoteVideoUrl={currentCall?.remoteVideoUrl}
          callSession={currentCall?.callSession}
          onAcceptCall={() => {
            if (incomingCall?.sessionId) {
              answerCall(incomingCall.sessionId, {
                participantName: incomingCall.participantName,
                participantRole: incomingCall.participantRole,
                participantId: incomingCall.participantId,
                type: incomingCall.type,
                mode: incomingCall.mode,
              });
            }
          }}
          onRejectCall={() => {
            if (incomingCall?.sessionId) {
              rejectCall(incomingCall.sessionId);
            }
          }}
          onEndCall={() => endCall()}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleCamera={toggleCamera}
          onToggleHold={toggleHold}
          onRemoteJoined={() => markCallConnected()}
        />
      </View>
    </ScreenLayout>
  );
}
