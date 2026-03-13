import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Calendar,
  Video,
  MessageCircle,
  Lock,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import UserAvatar from "@/components/UserAvatar";

export default function SearchMedicsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { profile } = usePatientProfile();
  const { isUserOnline } = useOnlineUsers();
  const completion = useMemo(() => getProfileCompletion(profile), [profile]);
  const isProfileComplete = completion.percent >= 99;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    category: "",
    specialization: "",
    experience: "any",
  });
  const [showFilters, setShowFilters] = useState(false);
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

  const medicsQuery = useQuery({
    queryKey: ["medics", query, filters],
    queryFn: () => {
      const experienceRanges = {
        any: null,
        "0-2": [0, 2],
        "3-5": [3, 5],
        "6-10": [6, 10],
        "10+": [10, 100],
      };
      const range = experienceRanges[filters.experience];
      return apiClient.getMedics({
        search: query || undefined,
        location: filters.location || undefined,
        category: filters.category || undefined,
        specialization: filters.specialization || undefined,
        experienceMin: range ? range[0] : undefined,
        experienceMax: range ? range[1] : undefined,
      });
    },
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "patient-chat-access"],
    queryFn: () => apiClient.getAppointments(),
  });

  const medics = medicsQuery.data?.items || medicsQuery.data || [];
  const bookedMedicIds = useMemo(() => {
    const items = appointmentsQuery.data?.items || appointmentsQuery.data || [];
    const ids = new Set();
    items.forEach((appt) => {
      const status = String(appt?.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled") return;
      const medicId = appt?.medicId || appt?.medic_id;
      if (medicId) ids.add(String(medicId));
    });
    return ids;
  }, [appointmentsQuery.data]);

  const filteredMedics = useMemo(() => {
    const experienceRanges = {
      any: null,
      "0-2": [0, 2],
      "3-5": [3, 5],
      "6-10": [6, 10],
      "10+": [10, 100],
    };
    const range = experienceRanges[filters.experience];
    return medics.filter((medic) => {
      const name = `${medic.name || ""} ${medic.firstName || ""} ${medic.lastName || ""}`.toLowerCase();
      const specialization = String(medic.specialization || medic.areaOfSpecialization || "").toLowerCase();
      const category = String(medic.category || medic.type || "").toLowerCase();
      const location = String(medic.location || medic.city || medic.area || "").toLowerCase();
      const years =
        Number(medic.experienceYears || medic.yearsOfExperience || medic.experience || 0) || 0;

      const matchesLocation = !filters.location || location.includes(filters.location.toLowerCase());
      const matchesCategory = !filters.category || category.includes(filters.category.toLowerCase());
      const matchesSpecialization =
        !filters.specialization || specialization.includes(filters.specialization.toLowerCase());
      const matchesExperience = !range || (years >= range[0] && years <= range[1]);
      const matchesQuery = !query || name.includes(query.toLowerCase()) || specialization.includes(query.toLowerCase());

      return matchesLocation && matchesCategory && matchesSpecialization && matchesExperience && matchesQuery;
    });
  }, [medics, filters, query]);

  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    return {
      locations: unique(
        medics.map((medic) => medic.location || medic.city || medic.area || ""),
      ),
      categories: unique(medics.map((medic) => medic.category || medic.type || "")),
      specializations: unique(
        medics.map(
          (medic) =>
            medic.specialization || medic.areaOfSpecialization || "",
        ),
      ),
    };
  }, [medics]);

  const handleProtectedBooking = (medicId) => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Your Profile",
        "Please complete at least 99% of your profile before booking appointments.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(patient)/edit-profile"),
          },
        ],
      );
      return;
    }
    router.push(`/(app)/(patient)/book-appointment?medicId=${medicId}`);
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
        {/* Header */}
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
            Find Medics
          </Text>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Search color={theme.iconColor} size={20} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                fontFamily: "Inter_400Regular",
                color: theme.text,
                marginLeft: 12,
              }}
              placeholder="Search by name or specialty"
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              alignItems: "center",
            }}
            onPress={() => setShowFilters((prev) => !prev)}
          >
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              {showFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
            </Text>
          </TouchableOpacity>
          {showFilters && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Advanced Filters
              </Text>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={filters.location}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, location: value }))
                  }
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Locations" value="" />
                  {filterOptions.locations.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={filters.category}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, category: value }))
                  }
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Categories" value="" />
                  {filterOptions.categories.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={filters.specialization}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, specialization: value }))
                  }
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Specializations" value="" />
                  {filterOptions.specializations.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {["any", "0-2", "3-5", "6-10", "10+"].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: filters.experience === range ? `${theme.primary}20` : theme.surface,
                      borderWidth: 1,
                      borderColor: filters.experience === range ? theme.primary : theme.border,
                    }}
                    onPress={() => setFilters((prev) => ({ ...prev, experience: range }))}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: filters.experience === range ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {range === "any" ? "Any exp" : `${range} yrs`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {completion.percent < 100 && (
          <View
            style={{
              backgroundColor: `${theme.warning}15`,
              borderRadius: 12,
              padding: 12,
              marginHorizontal: 24,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: `${theme.warning}30`,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: theme.warning,
              }}
            >
              Profile completion is {completion.percent}%. Booking unlocks at
              99%.
            </Text>
          </View>
        )}

        {/* Medics List */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filteredMedics.length === 0 && !medicsQuery.isLoading ? (
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
                No medics found.
              </Text>
            </View>
          ) : (
            filteredMedics.map((medic, index) => (
              <MotiView
                key={medic.id || medic.medicId || medic.name || index}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 600, delay: index * 80 }}
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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <UserAvatar
                      user={medic}
                      size={52}
                      backgroundColor={theme.surface}
                      borderColor={theme.border}
                      textColor={theme.primary}
                      textStyle={{ fontFamily: "Inter_700Bold" }}
                    />

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.text,
                          }}
                        >
                          {medic.name ||
                            `${medic.firstName || ""} ${medic.lastName || ""}`.trim()}
                        </Text>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            marginLeft: 8,
                            backgroundColor: isUserOnline(medic) ? "#22C55E" : theme.textSecondary,
                          }}
                        />
                        <Text
                          style={{
                            marginLeft: 4,
                            fontSize: 11,
                            color: isUserOnline(medic) ? "#22C55E" : theme.textSecondary,
                          }}
                        >
                          {isUserOnline(medic) ? "Online" : "Offline"}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_400Regular",
                          color: theme.textSecondary,
                        }}
                      >
                        {medic.specialization || "General Practice"}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        <Star color="#FFD700" size={12} fill="#FFD700" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: theme.text,
                            marginLeft: 4,
                          }}
                        >
                          {medic.rating || 4.7}
                        </Text>
                        <MapPin
                          color={theme.textTertiary}
                          size={12}
                          style={{ marginLeft: 12 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_400Regular",
                            color: theme.textSecondary,
                            marginLeft: 4,
                          }}
                        >
                          {medic.location || "Nearby"}
                        </Text>
                        <Text
                          style={{
                            marginLeft: 12,
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.primary,
                          }}
                        >
                          KES{" "}
                          {Number(
                            medic.consultationFee ?? medic.fee ?? 0,
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    {(() => {
                      const targetId = String(medic.id || medic.medicId || "");
                      const canChat = targetId && bookedMedicIds.has(targetId);
                      return (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: theme.surface,
                            borderRadius: 12,
                            paddingVertical: 10,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            opacity: canChat ? 1 : 0.6,
                            borderWidth: canChat ? 0 : 1,
                            borderColor: canChat ? "transparent" : theme.border,
                          }}
                          onPress={() => {
                            if (!canChat) {
                              Alert.alert(
                                "Chat Locked",
                                "Book an appointment with this medic to unlock chat.",
                              );
                              return;
                            }
                            router.push(`/(app)/(patient)/chat?medicId=${targetId}`);
                          }}
                        >
                          {canChat ? (
                            <MessageCircle color={theme.textSecondary} size={16} />
                          ) : (
                            <Lock color={theme.textSecondary} size={16} />
                          )}
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Inter_500Medium",
                              color: theme.textSecondary,
                              marginLeft: 6,
                            }}
                          >
                            {canChat ? "Chat" : "Chat Locked"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: `${theme.primary}15`,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                      onPress={() =>
                        Alert.alert("Start Call", "Choose call type", [
                          {
                            text: "Audio",
                            onPress: () =>
                              makeMedicalCall(medic.id || medic.medicId, null, {
                                mode: "audio",
                              }),
                          },
                          {
                            text: "Video",
                            onPress: () =>
                              makeMedicalCall(medic.id || medic.medicId, null, {
                                mode: "video",
                              }),
                          },
                          { text: "Cancel", style: "cancel" },
                        ])
                      }
                    >
                      <Video color={theme.primary} size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_600SemiBold",
                          color: theme.primary,
                          marginLeft: 6,
                        }}
                      >
                        Video
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                    onPress={() =>
                      router.push(
                        `/(app)/(patient)/medic-profile?medicId=${medic.id || ""}`,
                      )
                    }
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.textSecondary,
                      }}
                    >
                      View Profile
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      backgroundColor: isProfileComplete
                        ? theme.primary
                        : theme.surface,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      borderWidth: isProfileComplete ? 0 : 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => handleProtectedBooking(medic.id || "")}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: isProfileComplete ? "#FFFFFF" : theme.textSecondary,
                      }}
                    >
                      Book Appointment
                    </Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
