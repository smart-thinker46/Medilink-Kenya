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
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";

export default function HospitalShiftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
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
  const shifts = shiftsQuery.data?.items || shiftsQuery.data || [];
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
                  <Picker.Item label="Completed" value="COMPLETED" />
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
          data={shifts}
          keyExtractor={(item, index) => item.id || `shift-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const appliedCount = Array.isArray(item?.applications) ? item.applications.length : 0;
            const isExpanded = expandedShiftId === item.id;
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
