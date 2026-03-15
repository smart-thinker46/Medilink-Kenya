import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ArrowLeft, Clock, Users, CheckCircle, Filter, XCircle } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useMedicProfile } from "@/utils/useMedicProfile";
import { getMedicProfileCompletion } from "@/utils/medicProfileCompletion";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";

export default function MedicShiftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useMedicProfile();
  const {
    isSuperAdmin,
    medicUserId,
    medics,
    setSelectedMedicUserId,
    isLoadingScope,
  } = useMedicScope();
  const currentUserId = medicUserId;
  const completion = useMemo(
    () => getMedicProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = isSuperAdmin || completion.percent >= 99;
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedShiftId, setExpandedShiftId] = useState(null);

  const shiftsQuery = useQuery({
    queryKey: ["available-shifts", searchQuery, locationFilter, specializationFilter, hospitalFilter],
    queryFn: () =>
      apiClient.getShifts({
        search: searchQuery || undefined,
        location: locationFilter || undefined,
        specialization: specializationFilter || undefined,
        hospital: hospitalFilter || undefined,
      }),
  });
  const shiftsRaw = shiftsQuery.data?.items || shiftsQuery.data || [];
  const shifts = useMemo(() => {
    const items = Array.isArray(shiftsRaw) ? shiftsRaw : [];
    const normalize = (v) => String(v || "").trim().toLowerCase();
    const normalizeDate = (v) => String(v || "").trim();
    const normalizeTime = (v) => {
      const raw = String(v || "").trim();
      const match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return raw;
      const hh = String(match[1] || "").padStart(2, "0");
      const mm = String(match[2] || "").padStart(2, "0");
      return `${hh}:${mm}`;
    };
    const pickTime = (row) => {
      const t = row?.updatedAt || row?.createdAt || "";
      const parsed = t ? new Date(t).getTime() : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const keyFor = (row) => {
      const createdBy = String(row?.createdBy || "");
      const hospitalKey = normalize(row?.hospitalName || row?.hospital || row?.employerName);
      const shiftDate = normalizeDate(row?.shiftDate || row?.date);
      const startTime = normalizeTime(row?.startTime);
      const endTime = normalizeTime(row?.endTime);
      const title = normalize(row?.title || row?.task);
      const department = normalize(row?.department);
      const specialization = normalize(row?.specialization || row?.category);
      return `${createdBy}|${hospitalKey}|${shiftDate}|${startTime}|${endTime}|${title}|${department}|${specialization}`;
    };
    const map = new Map();
    items.forEach((row) => {
      const key = keyFor(row);
      const existing = map.get(key);
      if (!existing || pickTime(row) >= pickTime(existing)) {
        map.set(key, row);
      }
    });
    return Array.from(map.values());
  }, [shiftsRaw]);
  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    return {
      locations: unique(shifts.map((shift) => shift.location || shift.area || "")),
      specializations: unique(
        shifts.map((shift) => shift.specialization || shift.category || ""),
      ),
      hospitals: unique(
        shifts.map((shift) => shift.hospitalName || shift.hospital || ""),
      ),
    };
  }, [shifts]);
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const searchText = String(searchQuery || "").trim().toLowerCase();
      const title = String(shift.title || shift.task || "").toLowerCase();
      const hospital = String(shift.hospitalName || shift.hospital || "").toLowerCase();
      const location = String(shift.location || shift.area || "").toLowerCase();
      const specialization = String(shift.specialization || shift.category || "").toLowerCase();
      const description = String(shift.description || shift.specifications || "").toLowerCase();
      const payType = String(shift.payType || "").toLowerCase();
      const payAmount = String(shift.payAmount ?? "").toLowerCase();

      const matchesSearch =
        !searchText ||
        title.includes(searchText) ||
        hospital.includes(searchText) ||
        location.includes(searchText) ||
        specialization.includes(searchText) ||
        description.includes(searchText) ||
        payType.includes(searchText) ||
        payAmount.includes(searchText);
      const matchesHospital =
        !hospitalFilter || hospital.includes(hospitalFilter.toLowerCase());
      const matchesLocation =
        !locationFilter || location.includes(locationFilter.toLowerCase());
      const matchesSpecialization =
        !specializationFilter ||
        specialization.includes(specializationFilter.toLowerCase());

      return (
        matchesSearch &&
        matchesHospital &&
        matchesLocation &&
        matchesSpecialization
      );
    });
  }, [shifts, searchQuery, locationFilter, specializationFilter, hospitalFilter]);

  const getMyApplication = (shift) => {
    const applications = Array.isArray(shift?.applications) ? shift.applications : [];
    if (!currentUserId) return null;
    return applications.find((item) => String(item?.medicId || "") === String(currentUserId)) || null;
  };

  const getApplicationStatus = (application) => {
    const raw = String(application?.status || "PENDING").toUpperCase();
    if (raw === "APPROVED") return "APPROVED";
    if (raw === "REJECTED") return "REJECTED";
    return "PENDING";
  };

  const applyMutation = useMutation({
    mutationFn: (shiftId) => apiClient.applyToShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
    },
  });
  const cancelApplicationMutation = useMutation({
    mutationFn: (shiftId) => apiClient.cancelShiftApplication(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
    },
  });

  const handleApply = async (shiftId) => {
    if (isSuperAdmin) {
      showToast("Admin medic view is read-only for shift applications.", "warning");
      return;
    }
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before applying to shifts.",
        "warning",
      );
      return;
    }
    try {
      const response = await applyMutation.mutateAsync(shiftId);
      const alreadyApplied = Boolean(response?.alreadyApplied);
      showToast(
        alreadyApplied
          ? "Shift already applied. Waiting for approval."
          : "Shift applied. Waiting for approval.",
        "success",
      );
    } catch (error) {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Apply failed. Please try again.", "error");
    }
  };

  const handleCancelApplication = (shiftId) => {
    if (isSuperAdmin) {
      showToast("Admin medic view is read-only for shift applications.", "warning");
      return;
    }
    Alert.alert(
      "Cancel application",
      "Do you want to cancel this shift application?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelApplicationMutation.mutateAsync(shiftId);
              showToast("Shift application cancelled.", "success");
            } catch (error) {
              showToast(
                error?.message || "Failed to cancel application. Please try again.",
                "error",
              );
            }
          },
        },
      ],
    );
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
            Hospital Shifts
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <MedicScopeSelector
            visible={isSuperAdmin}
            medics={medics}
            selectedMedicId={medicUserId}
            onSelect={setSelectedMedicUserId}
            loading={isLoadingScope}
          />
        </View>

        {!isSuperAdmin && completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Applying unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(medic)/edit-profile")}
          />
        )}

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
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
              style={{
                flex: 1,
                color: theme.text,
              }}
              placeholder="Search by hospital, location, specialization, or price"
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
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
                Advanced Filters
              </Text>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={hospitalFilter}
                  onValueChange={(value) => setHospitalFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Hospitals" value="" />
                  {filterOptions.hospitals.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={locationFilter}
                  onValueChange={(value) => setLocationFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Locations" value="" />
                  {filterOptions.locations.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12 }}>
                <Picker
                  selectedValue={specializationFilter}
                  onValueChange={(value) => setSpecializationFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Specializations" value="" />
                  {filterOptions.specializations.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        <FlatList
          data={filteredShifts}
          keyExtractor={(item, index) => item.id || `shift-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const myApplication = getMyApplication(item);
            const applicationStatus = getApplicationStatus(myApplication);
            const isApplied = Boolean(myApplication);
            const appliedCount = Array.isArray(item?.applications) ? item.applications.length : 0;
            const isExpanded = expandedShiftId === item.id;
            const statusColor =
              applicationStatus === "APPROVED"
                ? theme.success
                : applicationStatus === "REJECTED"
                  ? theme.error
                  : theme.warning;
            const statusLabel =
              applicationStatus === "APPROVED"
                ? "Shift application approved."
                : applicationStatus === "REJECTED"
                  ? "Shift application rejected."
                  : "Shift applied. Waiting for approval.";

            return (
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
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onPress={() =>
                    setExpandedShiftId((prev) => (prev === item.id ? null : item.id))
                  }
                  activeOpacity={0.8}
                >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                        marginRight: 10,
                      }}
                    >
                      {item.title || item.task || "Open Shift"}
                    </Text>
                    <View
                      style={{
                        backgroundColor: theme.primary,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                        }}
                      >
                        Applied {appliedCount}
                      </Text>
                    </View>
                </TouchableOpacity>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: theme.textTertiary,
                  }}
                >
                  {isExpanded ? "Tap shift title to collapse" : "Tap shift title to view details"}
                </Text>
                {isExpanded && (
                  <>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginBottom: 10,
                  }}
                >
                  {item.description || item.specifications || "Shift details"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  Hospital: {item.hospitalName || item.hospital || "N/A"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  Location: {item.location || item.area || "N/A"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    marginBottom: 10,
                  }}
                >
                  Specialization: {item.specialization || item.category || "General"}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock color={theme.textSecondary} size={14} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    {item.hours || item.duration || "--"} hrs
                  </Text>
                  <Users color={theme.textSecondary} size={14} style={{ marginLeft: 12 }} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    {item.requiredMedics || item.medicsRequired || 0} required
                  </Text>
                </View>
                {isApplied && (
                    <View
                      style={{
                        marginTop: 10,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: `${statusColor}1A`,
                        borderWidth: 1,
                        borderColor: `${statusColor}66`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_600SemiBold",
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </Text>
                      {myApplication?.appliedAt ? (
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: theme.textSecondary,
                          }}
                        >
                          Applied: {new Date(myApplication.appliedAt).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                  )}

                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Status: {String(item.status || "OPEN").toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Hours: {item.hours || item.duration || "--"} hrs
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Required Medics: {item.requiredMedics || item.medicsRequired || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Pay Type: {item.payType || "N/A"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Pay Amount: {item.payAmount != null ? `KES ${item.payAmount}` : "N/A"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Requirements: {item.specifications || item.requirements || "Not provided"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Created: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "N/A"}
                  </Text>
                  {myApplication?.appliedAt ? (
                    <Text style={{ fontSize: 12, color: theme.text }}>
                      Your Application: {new Date(myApplication.appliedAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: isApplied ? theme.surface : theme.primary,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    borderWidth: isApplied ? 1 : 0,
                    borderColor: theme.border,
                    opacity: isApplied ? 0.9 : 1,
                  }}
                  disabled={isApplied || applyMutation.isLoading || cancelApplicationMutation.isLoading}
                  onPress={() => handleApply(item.id)}
                >
                  <CheckCircle color={isApplied ? theme.textSecondary : "#FFFFFF"} size={16} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: isApplied ? theme.textSecondary : "#FFFFFF",
                      marginLeft: 6,
                    }}
                  >
                    {isApplied ? "Applied" : "Apply"}
                  </Text>
                </TouchableOpacity>

                {isApplied && (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#FCA5A5",
                    }}
                    disabled={cancelApplicationMutation.isLoading}
                    onPress={() => handleCancelApplication(item.id)}
                  >
                    <XCircle color="#DC2626" size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: "#DC2626",
                        marginLeft: 6,
                      }}
                    >
                      Cancel Application
                    </Text>
                  </TouchableOpacity>
                )}
                  </>
                )}
              </View>
            </MotiView>
            );
          }}
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
                No shifts available yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
