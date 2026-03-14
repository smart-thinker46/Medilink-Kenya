import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";

export default function ShiftCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const editShiftId = params?.shiftId ? String(params.shiftId) : null;
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const raw = String(value).trim().toLowerCase();
    const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const meridiem = match[3];
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;
    if (meridiem) {
      if (hours === 12) hours = 0;
      if (meridiem === "pm") hours += 12;
    }
    if (hours < 0 || hours > 23) return null;
    return hours * 60 + minutes;
  };

  const computeHours = (startTime, endTime) => {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    if (start === null || end === null || end <= start) return 0;
    return Math.round(((end - start) / 60) * 100) / 100;
  };

  const toggleListValue = (values, entry) => {
    if (!Array.isArray(values)) return [entry];
    return values.includes(entry)
      ? values.filter((item) => item !== entry)
      : [...values, entry];
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    department: "",
    specialization: "",
    shiftDate: "",
    startTime: "",
    endTime: "",
    shiftType: "morning",
    consultationDuration: "",
    maxPatients: "",
    breakMinutes: "",
    bufferMinutes: "",
    hospitalBranch: "",
    roomNumber: "",
    consultationTypes: ["physical"],
    isAvailable: true,
    walkInAllowed: false,
    emergencySlotReserved: false,
    repeatInterval: "none",
    repeatDays: [],
    medicsRequired: "",
    payType: "per_hour",
    payAmount: "",
  });

  const shiftsQuery = useQuery({
    queryKey: ["shifts", "hospital", "edit", editShiftId],
    queryFn: () => apiClient.getShifts({ mine: true }),
    enabled: Boolean(editShiftId),
  });
  React.useEffect(() => {
    if (!editShiftId) return;
    const shifts = shiftsQuery.data?.items || shiftsQuery.data || [];
    const shift = shifts.find((item) => item.id === editShiftId);
    if (!shift) return;
    setFormData((prev) => ({
      ...prev,
      title: shift.title || shift.task || "",
      description: shift.description || "",
      requirements: shift.specifications || "",
      department: shift.department || "",
      specialization: shift.specialization || shift.category || "",
      shiftDate: shift.shiftDate || shift.date || "",
      startTime: shift.startTime || "",
      endTime: shift.endTime || "",
      shiftType: shift.shiftType || "morning",
      consultationDuration: String(shift.consultationDuration || ""),
      maxPatients: String(shift.maxPatients || ""),
      breakMinutes: String(shift.breakMinutes || ""),
      bufferMinutes: String(shift.bufferMinutes || ""),
      hospitalBranch: shift.hospitalBranch || "",
      roomNumber: shift.roomNumber || "",
      consultationTypes: shift.consultationTypes || ["physical"],
      isAvailable: shift.isAvailable !== false,
      walkInAllowed: Boolean(shift.walkInAllowed),
      emergencySlotReserved: Boolean(shift.emergencySlotReserved),
      repeatInterval: shift.repeatInterval || "none",
      repeatDays: shift.repeatDays || [],
      medicsRequired: String(shift.requiredMedics || shift.medicsRequired || ""),
      payType: shift.payType || "per_hour",
      payAmount: String(shift.payAmount || ""),
    }));
  }, [editShiftId, shiftsQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload) =>
      editShiftId
        ? apiClient.updateShift(editShiftId, payload)
        : apiClient.createShift(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "hospital"] });
      showToast(
        editShiftId ? "Shift updated successfully." : "Shift posted successfully.",
        "success",
      );
      router.back();
    },
    onError: (error) => {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Creation failed. Please try again.", "error");
    },
  });

  const handleCreate = () => {
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before creating shifts.",
        "warning",
      );
      return;
    }
    const requiredFields = [
      formData.title,
      formData.department,
      formData.specialization,
      formData.shiftDate,
      formData.startTime,
      formData.endTime,
      formData.shiftType,
      formData.consultationDuration,
      formData.maxPatients,
      formData.medicsRequired,
    ];
    if (requiredFields.some((value) => !String(value || "").trim())) {
      showToast("Please complete the required fields.", "warning");
      return;
    }
    const computedHours = computeHours(formData.startTime, formData.endTime);
    if (!computedHours) {
      showToast("Start time and end time are invalid.", "warning");
      return;
    }

    createMutation.mutate({
      title: formData.title,
      task: formData.title,
      description: formData.description,
      specifications: formData.requirements,
      department: formData.department,
      specialization: formData.specialization,
      shiftDate: formData.shiftDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      shiftType: formData.shiftType,
      consultationDuration: Number(formData.consultationDuration) || 0,
      maxPatients: Number(formData.maxPatients) || 0,
      breakMinutes: Number(formData.breakMinutes) || 0,
      bufferMinutes: Number(formData.bufferMinutes) || 0,
      hospitalBranch: formData.hospitalBranch || undefined,
      roomNumber: formData.roomNumber || undefined,
      consultationTypes: formData.consultationTypes,
      isAvailable: formData.isAvailable,
      walkInAllowed: formData.walkInAllowed,
      emergencySlotReserved: formData.emergencySlotReserved,
      repeatInterval: formData.repeatInterval,
      repeatDays: formData.repeatDays,
      requiredMedics: Number(formData.medicsRequired) || 0,
      hours: Number(computedHours) || 0,
      payType: formData.payType,
      payAmount: Number(formData.payAmount) || 0,
    });
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
            {editShiftId ? "Edit Shift" : "Create Shift"}
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Shift creation unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Basic Information
          </Text>
          <Input
            label="Shift Title / Task"
            placeholder="e.g. Night ICU Coverage"
            value={formData.title}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, title: value }))
            }
            required
          />

          <Input
            label="Department"
            placeholder="e.g. Cardiology"
            value={formData.department}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, department: value }))
            }
            required
          />

          <Input
            label="Specialty"
            placeholder="e.g. Daktari wa Moyo"
            value={formData.specialization}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, specialization: value }))
            }
            required
          />

          <Input
            label="What should be done"
            placeholder="Describe responsibilities"
            value={formData.description}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, description: value }))
            }
            multiline
            numberOfLines={4}
          />

          <Input
            label="Medic specifications"
            placeholder="Required skills, specialty, licenses"
            value={formData.requirements}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, requirements: value }))
            }
            multiline
            numberOfLines={3}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Shift Date & Time
          </Text>
          <Input
            label="Shift Date"
            placeholder="YYYY-MM-DD"
            value={formData.shiftDate}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, shiftDate: value }))
            }
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Start Time"
                placeholder="08:00"
                value={formData.startTime}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, startTime: value }))
                }
                required
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="End Time"
                placeholder="16:00"
                value={formData.endTime}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, endTime: value }))
                }
                required
              />
            </View>
          </View>

          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 16 }}>
            Total hours: {computeHours(formData.startTime, formData.endTime) || 0}
          </Text>

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Shift Type
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {["morning", "afternoon", "night", "emergency"].map((option) => {
              const active = formData.shiftType === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, shiftType: option }))
                  }
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Appointment Settings
          </Text>
          <Input
            label="Consultation duration (minutes)"
            placeholder="e.g. 20"
            value={formData.consultationDuration}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, consultationDuration: value }))
            }
            keyboardType="numeric"
            required
          />
          <Input
            label="Max patients per shift"
            placeholder="e.g. 20"
            value={formData.maxPatients}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, maxPatients: value }))
            }
            keyboardType="numeric"
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Break time (minutes)"
                placeholder="e.g. 30"
                value={formData.breakMinutes}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, breakMinutes: value }))
                }
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Buffer between patients (minutes)"
                placeholder="e.g. 5"
                value={formData.bufferMinutes}
                onChangeText={(value) =>
                  setFormData((prev) => ({ ...prev, bufferMinutes: value }))
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Location Information
          </Text>
          <Input
            label="Hospital Branch"
            placeholder="e.g. Nairobi West Hospital"
            value={formData.hospitalBranch}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, hospitalBranch: value }))
            }
          />
          <Input
            label="Room Number / Consultation Room"
            placeholder="e.g. Room 12"
            value={formData.roomNumber}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, roomNumber: value }))
            }
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Consultation Type
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {["physical", "online", "emergency"].map((option) => {
              const active = formData.consultationTypes.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      consultationTypes: toggleListValue(prev.consultationTypes, option),
                    }))
                  }
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Availability Settings
          </Text>
          {[
            { key: "isAvailable", label: "Available for booking" },
            { key: "walkInAllowed", label: "Walk-in allowed" },
            { key: "emergencySlotReserved", label: "Emergency slot reserved" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
              onPress={() =>
                setFormData((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key],
                }))
              }
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>{item.label}</Text>
              <View
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: formData[item.key] ? theme.primary : theme.border,
                  alignItems: formData[item.key] ? "flex-end" : "flex-start",
                  padding: 3,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "#fff",
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8, marginTop: 16 }}>
            Recurring Shift
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {["none", "daily", "weekly", "monthly"].map((option) => {
              const active = formData.repeatInterval === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, repeatInterval: option }))
                  }
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {formData.repeatInterval !== "none" && (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                const active = formData.repeatDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}15` : theme.surface,
                    }}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        repeatDays: toggleListValue(prev.repeatDays, day),
                      }))
                    }
                  >
                    <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Input
            label="Number of medics required"
            placeholder="e.g. 4"
            value={formData.medicsRequired}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, medicsRequired: value }))
            }
            keyboardType="numeric"
            required
          />

          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_500Medium",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Payment Type
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {["per_hour", "total"].map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    formData.payType === option ? theme.primary : theme.border,
                  backgroundColor:
                    formData.payType === option ? `${theme.primary}15` : theme.surface,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
                onPress={() =>
                  setFormData((prev) => ({ ...prev, payType: option }))
                }
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      formData.payType === option
                        ? theme.primary
                        : theme.textSecondary,
                    textTransform: "capitalize",
                  }}
                >
                  {option === "per_hour" ? "Per Hour" : "Total"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={
              formData.payType === "per_hour"
                ? "Rate per hour (KES)"
                : "Total amount (KES)"
            }
            placeholder="e.g. 1500"
            value={formData.payAmount}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, payAmount: value }))
            }
            keyboardType="numeric"
          />

          <Button
            title={editShiftId ? "Save Changes" : "Publish Shift"}
            onPress={handleCreate}
            loading={createMutation.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
