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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    medicsRequired: "",
    hours: "",
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
      medicsRequired: String(shift.requiredMedics || shift.medicsRequired || ""),
      hours: String(shift.hours || ""),
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
    if (!formData.title || !formData.medicsRequired || !formData.hours) {
      showToast("Please complete the required fields.", "warning");
      return;
    }

    createMutation.mutate({
      title: formData.title,
      task: formData.title,
      description: formData.description,
      specifications: formData.requirements,
      requiredMedics: Number(formData.medicsRequired) || 0,
      hours: Number(formData.hours) || 0,
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

          <Input
            label="Working hours"
            placeholder="e.g. 8"
            value={formData.hours}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, hours: value }))
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
