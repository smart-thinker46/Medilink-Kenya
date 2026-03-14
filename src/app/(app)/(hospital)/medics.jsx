import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import {
  ArrowLeft,
  Mail,
  FileText,
  Video,
  CheckCircle,
  UserPlus,
  MapPin,
  Filter,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import LocationPreview from "@/components/LocationPreview";
import { getDistanceKm } from "@/utils/locationHelpers";
import { useOnlineUsers } from "@/utils/useOnlineUsers";

export default function HospitalMedicsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { isUserOnline } = useOnlineUsers();
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;
  const { makeMedicalCall } = useVideoCall();
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [experienceMinFilter, setExperienceMinFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const jobsQuery = useQuery({
    queryKey: ["hospital-jobs", "applications"],
    queryFn: () => apiClient.getJobs({ mine: true }),
  });

  const shiftsQuery = useQuery({
    queryKey: ["hospital-shifts", "applications"],
    queryFn: () => apiClient.getShifts({ mine: true }),
  });

  const applicantIds = useMemo(() => {
    const jobItems = jobsQuery.data?.items || jobsQuery.data || [];
    const shiftItems = shiftsQuery.data?.items || shiftsQuery.data || [];
    const ids = new Set();
    jobItems.forEach((job) => {
      const apps = Array.isArray(job?.applications) ? job.applications : [];
      apps.forEach((app) => {
        if (app?.medicId) ids.add(String(app.medicId));
      });
    });
    shiftItems.forEach((shift) => {
      const apps = Array.isArray(shift?.applications) ? shift.applications : [];
      apps.forEach((app) => {
        if (app?.medicId) ids.add(String(app.medicId));
      });
    });
    return Array.from(ids);
  }, [jobsQuery.data, shiftsQuery.data]);

  const medicsQuery = useQuery({
    queryKey: [
      "medics",
      "applicants",
      applicantIds.join(","),
      searchQuery,
      specializationFilter,
      locationFilter,
      availabilityFilter,
      experienceMinFilter,
    ],
    queryFn: () =>
      apiClient.getMedics({
        medicIds: applicantIds.length ? applicantIds.join(",") : undefined,
        search: searchQuery || undefined,
        specialization: specializationFilter || undefined,
        location: locationFilter || undefined,
        availabilityDay: availabilityFilter || undefined,
        experienceMin: experienceMinFilter || undefined,
      }),
    enabled: applicantIds.length > 0,
  });
  const medicsRaw = medicsQuery.data?.items || medicsQuery.data || [];
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
  const medics = myLocation
    ? [...medicsRaw].sort((a, b) => {
        const aLoc = linkedMap[a.id || a.medicId];
        const bLoc = linkedMap[b.id || b.medicId];
        const aDist = getDistanceKm(myLocation, aLoc);
        const bDist = getDistanceKm(myLocation, bLoc);
        if (aDist == null && bDist == null) return 0;
        if (aDist == null) return 1;
        if (bDist == null) return -1;
        return aDist - bDist;
      })
    : medicsRaw;
  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    const availabilityDays = unique(
      medicsRaw.flatMap((medic) => {
        if (Array.isArray(medic.availabilityDays)) return medic.availabilityDays;
        if (typeof medic.availabilityDays === "string") {
          return medic.availabilityDays
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
        }
        return [];
      }),
    );
    return {
      specializations: unique(medicsRaw.map((medic) => medic.specialization || "")),
      locations: unique(medicsRaw.map((medic) => medic.location || "")),
      availabilityDays,
    };
  }, [medicsRaw]);

  const handleProtected = (action) => {
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before hiring medics.",
        "warning",
      );
      return;
    }
    action();
  };

  const handleEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  };

  const handleViewCv = (cvUrl) => {
    if (!cvUrl) return;
    Linking.openURL(cvUrl);
  };

  const handleApprove = async (medicId) => {
    try {
      await apiClient.approveMedic(medicId);
      showToast("Medic approved.", "success");
    } catch (error) {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Approve failed. Please try again.", "error");
    }
  };

  const handleHire = async (medicId) => {
    try {
      await apiClient.hireMedic(medicId);
      showToast("Medic hired successfully.", "success");
    } catch (error) {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Hire failed. Please try again.", "error");
    }
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
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
            Available Medics
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Hiring unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <TextInput
                style={{ flex: 1, color: theme.text }}
                placeholder="Search medic by name/specialization"
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => setShowFilters((prev) => !prev)}
              >
                <Filter color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>
            {showFilters && (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    marginBottom: 8,
                  }}
                >
                  Filters
                </Text>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Picker
                    selectedValue={specializationFilter}
                    onValueChange={(value) => setSpecializationFilter(value)}
                    dropdownIconColor={theme.text}
                    style={{ color: theme.text }}
                  >
                    <Picker.Item label="All specializations" value="" />
                    {filterOptions.specializations.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Picker
                    selectedValue={locationFilter}
                    onValueChange={(value) => setLocationFilter(value)}
                    dropdownIconColor={theme.text}
                    style={{ color: theme.text }}
                  >
                    <Picker.Item label="All locations" value="" />
                    {filterOptions.locations.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Picker
                    selectedValue={availabilityFilter}
                    onValueChange={(value) => setAvailabilityFilter(value)}
                    dropdownIconColor={theme.text}
                    style={{ color: theme.text }}
                  >
                    <Picker.Item label="All availability days" value="" />
                    {filterOptions.availabilityDays.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <TextInput
                    style={{ color: theme.text }}
                    value={experienceMinFilter}
                    onChangeText={setExperienceMinFilter}
                    keyboardType="numeric"
                    placeholder="Minimum years experience"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </View>
            )}
          </View>

          {applicantIds.length === 0 && !jobsQuery.isLoading && !shiftsQuery.isLoading ? (
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
                No medics have applied for your jobs or shifts yet.
              </Text>
            </View>
          ) : medics.length === 0 && !medicsQuery.isLoading ? (
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
                No medics available yet.
              </Text>
            </View>
          ) : (
            medics.map((medic, index) => (
              <MotiView
                key={medic.id || medic.medicId || index}
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
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
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
                      marginBottom: 10,
                    }}
                  >
                    {medic.specialization || "General Practice"}
                  </Text>
                  {myLocation && linkedMap[medic.id || medic.medicId] ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: theme.surface,
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {getDistanceKm(
                          myLocation,
                          linkedMap[medic.id || medic.medicId],
                        )?.toFixed(1)}{" "}
                        km
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 10 }}>
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
                      onPress={() => handleEmail(medic.email)}
                    >
                      <Mail color={theme.textSecondary} size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_500Medium",
                          color: theme.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        Email
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
                        opacity: medic.cv ? 1 : 0.5,
                      }}
                      onPress={() => handleViewCv(medic.cv)}
                      disabled={!medic.cv}
                    >
                      <FileText color={theme.iconColor} size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_500Medium",
                          color: theme.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        View CV
                      </Text>
                    </TouchableOpacity>

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
                        Interview
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
                          params: { targetId: medic.id || medic.medicId, title: "Medic Location" },
                        })
                      }
                    >
                      <MapPin color={theme.iconColor} size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_500Medium",
                          color: theme.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        Location
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
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
                        handleProtected(() => handleApprove(medic.id || medic.medicId))
                      }
                    >
                      <CheckCircle color={theme.iconColor} size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_600SemiBold",
                          color: theme.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        Approve
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.primary,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                      onPress={() =>
                        handleProtected(() => handleHire(medic.id || medic.medicId))
                      }
                    >
                      <UserPlus color="#FFFFFF" size={16} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          marginLeft: 6,
                        }}
                      >
                        Hire
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {medic.id || medic.medicId ? (
                    <LocationPreview
                      targetId={medic.id || medic.medicId}
                      theme={theme}
                      isDark={isDark}
                      height={80}
                    />
                  ) : null}
                </View>
              </MotiView>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
