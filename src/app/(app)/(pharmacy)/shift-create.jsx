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
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { getPharmacyProfileCompletion } from "@/utils/pharmacyProfileCompletion";

export default function PharmacyJobCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const editJobId = params?.jobId ? String(params.jobId) : null;
  const { profile } = usePharmacyProfile();
  const completion = useMemo(() => getPharmacyProfileCompletion(profile), [profile]);
  const isProfileComplete = completion.percent >= 99;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requiredMedics: "",
    requirements: "",
    payAmount: "",
    specialization: "",
    location: "",
    hours: "",
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "pharmacy", "edit", editJobId],
    queryFn: () => apiClient.getJobs({ mine: true }),
    enabled: Boolean(editJobId),
  });

  React.useEffect(() => {
    if (!editJobId) return;
    const jobs = jobsQuery.data?.items || jobsQuery.data || [];
    const job = jobs.find((item) => item.id === editJobId);
    if (!job) return;

    setFormData((prev) => ({
      ...prev,
      title: job.title || "",
      description: job.description || "",
      requiredMedics: String(job.requiredMedics || ""),
      requirements: job.requirements || "",
      payAmount: String(job.payAmount || ""),
      specialization: job.specialization || "",
      location: job.location || "",
      hours: String(job.hours || ""),
    }));
  }, [editJobId, jobsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editJobId ? apiClient.updateJob(editJobId, payload) : apiClient.createJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "pharmacy"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      showToast(editJobId ? "Job updated successfully." : "Job posted successfully.", "success");
      router.back();
    },
    onError: (error) => {
      if (error?.missingFields?.length) {
        showToast(`Please complete: ${error.missingFields.join(", ")}`, "warning");
        return;
      }
      showToast(error.message || "Failed to save job.", "error");
    },
  });

  const handleSave = () => {
    if (!isProfileComplete) {
      showToast("Complete your profile before posting jobs.", "warning");
      return;
    }

    const missingFields = [];
    if (!String(formData.title || "").trim()) missingFields.push("Job title");
    if (!String(formData.description || "").trim()) missingFields.push("Job description");
    if (!String(formData.requirements || "").trim()) missingFields.push("Requirements");
    if ((Number(formData.requiredMedics) || 0) <= 0) missingFields.push("Available slots");

    if (missingFields.length) {
      showToast(`Please complete: ${missingFields.join(", ")}`, "warning");
      return;
    }

    saveMutation.mutate({
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      requiredMedics: Number(formData.requiredMedics) || 0,
      payAmount: Number(formData.payAmount) || 0,
      payType: "monthly",
      specialization: formData.specialization,
      location: formData.location,
      hours: Number(formData.hours) || 0,
    });
  };

  return (
    <ScreenLayout>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
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
          <Text style={{ fontSize: 24, fontFamily: "Nunito_700Bold", color: theme.text }}>
            {editJobId ? "Edit Job" : "Create Job"}
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Job posting unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(pharmacy)/edit-profile")}
          />
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <Input
            label="Job Title"
            placeholder="e.g. Community Pharmacist"
            value={formData.title}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            required
          />

          <Input
            label="Job Description"
            placeholder="Describe duties and expectations"
            value={formData.description}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, description: value }))}
            multiline
            numberOfLines={4}
            required
          />

          <Input
            label="Available Slots"
            placeholder="e.g. 2"
            value={formData.requiredMedics}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, requiredMedics: value }))}
            keyboardType="numeric"
            required
          />

          <Input
            label="Requirements"
            placeholder="Licenses, experience, certifications"
            value={formData.requirements}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, requirements: value }))}
            multiline
            numberOfLines={4}
            required
          />

          <Input
            label="Salary (Optional)"
            placeholder="e.g. 70000"
            value={formData.payAmount}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, payAmount: value }))}
            keyboardType="numeric"
          />

          <Input
            label="Specialization (Optional)"
            placeholder="e.g. Clinical Pharmacy"
            value={formData.specialization}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, specialization: value }))}
          />

          <Input
            label="Location (Optional)"
            placeholder="e.g. Mombasa"
            value={formData.location}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, location: value }))}
          />

          <Input
            label="Hours (Optional)"
            placeholder="e.g. 40"
            value={formData.hours}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, hours: value }))}
            keyboardType="numeric"
          />

          <Button
            title={editJobId ? "Save Job" : "Publish Job"}
            onPress={handleSave}
            loading={saveMutation.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
