import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Users, ArrowLeft, Filter, Edit3, XCircle, Trash2 } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";

export default function HospitalShiftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedShiftId, setExpandedShiftId] = useState(null);

  const shiftsQuery = useQuery({
    queryKey: [
      "shifts",
      "hospital",
      searchQuery,
      statusFilter,
      locationFilter,
      specializationFilter,
    ],
    queryFn: () =>
      apiClient.getShifts({
        mine: true,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        location: locationFilter || undefined,
        specialization: specializationFilter || undefined,
      }),
  });
  const shiftsRaw = shiftsQuery.data?.items || shiftsQuery.data || [];
  const shifts = useMemo(() => {
    const items = Array.isArray(shiftsRaw) ? shiftsRaw : [];
    const normalize = (v) => String(v || "").trim().toLowerCase();
    const normalizeDate = (v) => String(v || "").trim();
    const normalizeTime = (v) => {
      const raw = String(v || "").trim();
      // Normalize "8:00" -> "08:00" where possible.
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
      const createdBy = String(row?.createdBy || "").trim();
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
  const visibleShifts = useMemo(() => {
    if (!Array.isArray(shifts)) return [];

    // If a shift is recurring (repeatInterval != none), the backend auto-creates future instances.
    // Collapse those instances into one visible "series" row so creating 1 recurring shift shows as 1.
    const getRepeatKey = (value) => String(value || "").trim().toLowerCase();
    const makeSeriesKey = (shift) =>
      [
        String(shift?.title || shift?.task || "").trim().toLowerCase(),
        String(shift?.department || "").trim().toLowerCase(),
        String(shift?.specialization || shift?.category || "").trim().toLowerCase(),
        String(shift?.startTime || "").trim(),
        String(shift?.endTime || "").trim(),
        String(shift?.shiftType || "").trim().toLowerCase(),
        String(shift?.consultationDuration || "").trim(),
        String(shift?.maxPatients || "").trim(),
        String(shift?.hospitalBranch || "").trim().toLowerCase(),
        String(shift?.roomNumber || "").trim().toLowerCase(),
        String(shift?.location || shift?.area || "").trim().toLowerCase(),
        String(shift?.payType || "").trim().toLowerCase(),
        String(shift?.payAmount || "").trim(),
        String(shift?.createdBy || "").trim(),
      ].join("|");

    const bySeries = new Map();
    const nonRecurring = [];

    for (const shift of shifts) {
      const repeat = getRepeatKey(shift?.repeatInterval);
      if (!repeat || repeat === "none") {
        nonRecurring.push(shift);
        continue;
      }
      const key = makeSeriesKey(shift);
      const existing = bySeries.get(key) || [];
      existing.push(shift);
      bySeries.set(key, existing);
    }

    const pickRepresentative = (occurrences) => {
      const sorted = [...occurrences].sort((a, b) => {
        const da = String(a?.shiftDate || a?.date || "");
        const db = String(b?.shiftDate || b?.date || "");
        return da.localeCompare(db);
      });
      const rep = sorted[0] || occurrences[0];
      return {
        ...rep,
        __occurrenceCount: sorted.length,
        __occurrences: sorted,
      };
    };

    const recurringSeries = Array.from(bySeries.values()).map(pickRepresentative);
    return [...nonRecurring, ...recurringSeries].sort((a, b) => {
      const da = String(a?.shiftDate || a?.date || "");
      const db = String(b?.shiftDate || b?.date || "");
      return db.localeCompare(da);
    });
  }, [shifts]);
  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    return {
      locations: unique(shifts.map((shift) => shift.location || shift.area || "")),
      specializations: unique(
        shifts.map((shift) => shift.specialization || shift.category || ""),
      ),
    };
  }, [shifts]);

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => apiClient.cancelShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => apiClient.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
    },
  });

  const approveApplicationMutation = useMutation({
    mutationFn: ({ shiftId, medicId }) => apiClient.approveShiftApplication(shiftId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      showToast("Application approved.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Approve failed.", "error");
    },
  });

  const hireApplicationMutation = useMutation({
    mutationFn: ({ shiftId, medicId }) => apiClient.hireShiftApplication(shiftId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["medics", "hired"] });
      showToast("Medic hired.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Hire failed.", "error");
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: ({ shiftId, medicId }) => apiClient.rejectShiftApplication(shiftId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      showToast("Application denied.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Deny failed.", "error");
    },
  });

  const handleCreateShift = () => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Hospital Profile",
        "Please complete at least 99% of your hospital profile before creating shifts.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => router.push("/(app)/(hospital)/edit-profile"),
          },
        ],
      );
      return;
    }
    router.push("/(app)/(hospital)/shift-create");
  };

  const handleEditShift = (shift) => {
    router.push({
      pathname: "/(app)/(hospital)/shift-create",
      params: { shiftId: shift.id },
    });
  };

  const handleCancelShift = (shift) => {
    Alert.alert(
      "Cancel shift",
      "Applied medics will be notified in app and by email.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => cancelMutation.mutate({ id: shift.id }),
        },
      ],
    );
  };

  const handleDeleteShift = (shift) => {
    Alert.alert("Delete shift", "This action is permanent.", [
      { text: "No", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: shift.id }),
      },
    ]);
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
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 20,
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
              Shifts
            </Text>
          </View>

          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.primary,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleCreateShift}
          >
            <Plus color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>

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
              style={{ flex: 1, color: theme.text }}
              placeholder="Search by shift, location, specialization, or price"
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
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All statuses" value="" />
                  <Picker.Item label="Open" value="OPEN" />
                  <Picker.Item label="Cancelled" value="CANCELLED" />
                  <Picker.Item label="Closed" value="CLOSED" />
                </Picker>
              </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
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
              <View style={{ backgroundColor: theme.surface, borderRadius: 12 }}>
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
            </View>
          )}
        </View>

        <FlatList
          data={visibleShifts}
          keyExtractor={(item, index) => item.id || `shift-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const occurrenceCount = Number(item?.__occurrenceCount || 1);
            const occurrences = Array.isArray(item?.__occurrences) ? item.__occurrences : [item];
            const appliedCount = occurrences.reduce((sum, shift) => {
              const apps = Array.isArray(shift?.applications) ? shift.applications : [];
              return sum + apps.length;
            }, 0);
            const applications = Array.isArray(item?.applications) ? item.applications : [];
            const approvedCount = applications.filter((app) =>
              ["APPROVED", "HIRED"].includes(String(app?.status || "").toUpperCase()),
            ).length;
            const requiredSlots = Number(item?.requiredMedics || 0);
            const isExpanded = expandedShiftId === item.id;
            const shiftTypeKey = String(item?.shiftType || "").toLowerCase();
            const shiftTypeText = shiftTypeKey ? shiftTypeKey : "N/A";
            const shiftTone =
              shiftTypeKey === "morning"
                ? theme.success
                : shiftTypeKey === "afternoon"
                  ? theme.info
                  : shiftTypeKey === "night"
                    ? theme.accent
                    : shiftTypeKey === "emergency"
                      ? theme.error
                      : theme.primary;
            const slotsTone =
              requiredSlots > 0 && approvedCount >= requiredSlots
                ? theme.success
                : approvedCount > 0
                  ? theme.info
                  : theme.warning;
            const applicantPreviewNames = applications
              .slice(0, 3)
              .map((app, idx) => {
                const raw =
                  app?.medicName ||
                  app?.medicEmail ||
                  app?.fullName ||
                  app?.email ||
                  app?.medicId ||
                  `Medic ${idx + 1}`;
                return String(raw || "").trim();
              })
              .filter(Boolean);
            const remainingApplicants = Math.max(0, appliedCount - applicantPreviewNames.length);
            const applicantPreviewText = applicantPreviewNames.length
              ? `${applicantPreviewNames.join(", ")}${remainingApplicants ? ` +${remainingApplicants}` : ""}`
              : appliedCount > 0
                ? `${appliedCount} applicant(s)`
                : "No applicants yet";
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

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: `${shiftTone}55`,
                      backgroundColor: `${shiftTone}15`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: shiftTone,
                        fontFamily: "Inter_600SemiBold",
                        textTransform: "capitalize",
                      }}
                    >
                      Type: {shiftTypeText}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: `${slotsTone}55`,
                      backgroundColor: `${slotsTone}15`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: slotsTone,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      Slots: {approvedCount}/{requiredSlots || "?"} approved
                    </Text>
                  </View>
                  {occurrenceCount > 1 ? (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: `${theme.primary}55`,
                        backgroundColor: `${theme.primary}12`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.primary,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        Occurrences: {occurrenceCount}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => setExpandedShiftId((prev) => (prev === item.id ? null : item.id))}
                  activeOpacity={0.8}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Applicants:{" "}
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                      {applicantPreviewText}
                    </Text>
                  </Text>
                </TouchableOpacity>
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
                  {item.description || item.specifications || "Pending details"}
                </Text>
                {[
                  { label: "Date", value: item.shiftDate },
                  {
                    label: "Time",
                    value: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : null,
                  },
                  { label: "Department", value: item.department },
                  { label: "Specialty", value: item.specialization || item.category },
                  { label: "Consultation duration", value: item.consultationDuration ? `${item.consultationDuration} min` : null },
                  { label: "Max patients", value: item.maxPatients ? String(item.maxPatients) : null },
                  { label: "Branch", value: item.hospitalBranch },
                  { label: "Room", value: item.roomNumber },
                  {
                    label: "Consultation types",
                    value: Array.isArray(item.consultationTypes)
                      ? item.consultationTypes.map((type) => String(type)).join(", ")
                      : null,
                  },
                  {
                    label: "Availability",
                    value: item.isAvailable === false ? "Not available" : "Available",
                  },
                  {
                    label: "Walk-in",
                    value: item.walkInAllowed ? "Allowed" : "Not allowed",
                  },
                ]
                  .filter((row) => row.value)
                  .map((row) => (
                    <Text key={row.label} style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>
                      {row.label}: {row.value}
                    </Text>
                  ))}
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      String(item.status || "OPEN").toUpperCase() === "CANCELLED"
                        ? "#EF4444"
                        : theme.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Status: {String(item.status || "OPEN").toUpperCase()}
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
                    {item.requiredMedics || item.medicsRequired || 0} medics
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.surface,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleEditShift(item)}
                  >
                    <Edit3 color={theme.textSecondary} size={16} />
                    <Text style={{ marginLeft: 6, color: theme.textSecondary }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleCancelShift(item)}
                    disabled={String(item.status || "").toUpperCase() === "CANCELLED"}
                  >
                    <XCircle color="#DC2626" size={16} />
                    <Text style={{ marginLeft: 6, color: "#DC2626" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#FFF7ED",
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleDeleteShift(item)}
                  >
                    <Trash2 color="#C2410C" size={16} />
                    <Text style={{ marginLeft: 6, color: "#C2410C" }}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    Applicants ({approvedCount}/{requiredSlots || "?"} approved)
                  </Text>
                  {applications.length ? (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {applications.map((app, idx) => {
                        const status = String(app?.status || "PENDING").toUpperCase();
                        const name =
                          app?.medicName ||
                          app?.medicEmail ||
                          app?.medicId ||
                          `Medic ${idx + 1}`;
                        return (
                          <View
                            key={`${item.id}-app-${app?.medicId || idx}`}
                            style={{
                              backgroundColor: theme.surface,
                              borderRadius: 10,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: theme.border,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: theme.text }}>
                              {name}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                              Status: {status}
                            </Text>
                            {status === "HIRED" && (
                              <View
                                style={{
                                  marginTop: 8,
                                  alignSelf: "flex-start",
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 999,
                                  backgroundColor: `${theme.success}15`,
                                  borderWidth: 1,
                                  borderColor: `${theme.success}40`,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: theme.success,
                                    fontFamily: "Inter_600SemiBold",
                                  }}
                                >
                                  HIRED
                                </Text>
                              </View>
                            )}
                            {status === "PENDING" && (
                              <View style={{ marginTop: 8, gap: 8 }}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <TouchableOpacity
                                    style={{
                                      flex: 1,
                                      backgroundColor: `${theme.success}15`,
                                      borderRadius: 8,
                                      paddingVertical: 8,
                                      alignItems: "center",
                                      borderWidth: 1,
                                      borderColor: `${theme.success}40`,
                                    }}
                                    onPress={() =>
                                      approveApplicationMutation.mutate({
                                        shiftId: item.id,
                                        medicId: app.medicId,
                                      })
                                    }
                                  >
                                    <Text style={{ fontSize: 12, color: theme.success }}>Approve</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={{
                                      flex: 1,
                                      backgroundColor: `${theme.error}15`,
                                      borderRadius: 8,
                                      paddingVertical: 8,
                                      alignItems: "center",
                                      borderWidth: 1,
                                      borderColor: `${theme.error}40`,
                                    }}
                                    onPress={() =>
                                      rejectApplicationMutation.mutate({
                                        shiftId: item.id,
                                        medicId: app.medicId,
                                      })
                                    }
                                  >
                                    <Text style={{ fontSize: 12, color: theme.error }}>Deny</Text>
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: `${theme.primary}15`,
                                    borderRadius: 8,
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: `${theme.primary}40`,
                                  }}
                                  onPress={() =>
                                    Alert.alert(
                                      "Hire medic",
                                      "This will mark the medic as HIRED and add them to your hired list.",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Hire",
                                          onPress: () =>
                                            hireApplicationMutation.mutate({
                                              shiftId: item.id,
                                              medicId: app.medicId,
                                            }),
                                        },
                                      ],
                                    )
                                  }
                                >
                                  <Text style={{ fontSize: 12, color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
                                    Hire
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {status === "APPROVED" && (
                              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    backgroundColor: `${theme.primary}15`,
                                    borderRadius: 8,
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: `${theme.primary}40`,
                                  }}
                                  onPress={() =>
                                    Alert.alert(
                                      "Hire medic",
                                      "This will mark the medic as HIRED and add them to your hired list.",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Hire",
                                          onPress: () =>
                                            hireApplicationMutation.mutate({
                                              shiftId: item.id,
                                              medicId: app.medicId,
                                            }),
                                        },
                                      ],
                                    )
                                  }
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: theme.primary,
                                      fontFamily: "Inter_600SemiBold",
                                    }}
                                  >
                                    Hire
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    backgroundColor: `${theme.error}15`,
                                    borderRadius: 8,
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: `${theme.error}40`,
                                  }}
                                  onPress={() =>
                                    rejectApplicationMutation.mutate({
                                      shiftId: item.id,
                                      medicId: app.medicId,
                                    })
                                  }
                                >
                                  <Text style={{ fontSize: 12, color: theme.error }}>Deny</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
                      No applications yet.
                    </Text>
                  )}
                </View>
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
                No shifts created yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
