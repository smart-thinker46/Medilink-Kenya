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

  const toggleListValue = (values, entry) => {
    if (!Array.isArray(values)) return [entry];
    return values.includes(entry)
      ? values.filter((item) => item !== entry)
      : [...values, entry];
  };

  const [formData, setFormData] = useState({
    title: "",
    jobCategory: "Pharmacist",
    description: "",
    responsibilities: "",
    requiredMedics: "",
    requirements: "",
    educationLevel: "Degree",
    licenseBody: "",
    experienceYears: "",
    employmentType: "full_time",
    workSchedule: "day",
    department: "",
    specialization: "",
    facilityType: "Pharmacy",
    county: "",
    city: "",
    contactEmail: "",
    contactPhone: "",
    applicationDeadline: "",
    applicationMethod: "medilink",
    applicationLink: "",
    maxApplicants: "",
    requiredDocuments: [],
    payType: "monthly",
    salaryMin: "",
    salaryMax: "",
    payAmount: "",
    hours: "",
    qualifications: "",
    benefits: "",
    shiftPattern: "Long-term",
    startDate: "",
    drugDispensingExperience: "",
    inventoryManagementExperience: "",
    pharmacySoftwareExperience: "",
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
      jobCategory: job.jobCategory || job.category || "Pharmacist",
      description: job.description || "",
      responsibilities: job.responsibilities || "",
      requiredMedics: String(job.requiredMedics || ""),
      requirements: job.requirements || "",
      educationLevel: job.educationLevel || "Degree",
      licenseBody: job.licenseBody || "",
      experienceYears: String(job.experienceYears || ""),
      employmentType: job.jobType || "full_time",
      workSchedule: job.scheduleType || "day",
      department: job.department || "",
      specialization: job.specialization || "",
      facilityType: job.facilityType || "Pharmacy",
      county: job.county || "",
      city: job.city || "",
      contactEmail: job.contactEmail || "",
      contactPhone: job.contactPhone || "",
      applicationDeadline: job.applicationDeadline || "",
      applicationMethod: job.applicationMethod || "medilink",
      applicationLink: job.applicationLink || "",
      maxApplicants: String(job.maxApplicants || ""),
      requiredDocuments: (job.requiredDocuments || []).filter((doc) => doc !== "CV"),
      payType: job.payType || "monthly",
      salaryMin: String(job.payMin || ""),
      salaryMax: String(job.payMax || ""),
      payAmount: String(job.payAmount || ""),
      hours: String(job.hours || ""),
      qualifications: job.qualifications || "",
      benefits: job.benefits || "",
      shiftPattern: job.shiftPattern || "Long-term",
      startDate: job.startDate || "",
      drugDispensingExperience: job.drugDispensingExperience || "",
      inventoryManagementExperience: job.inventoryManagementExperience || "",
      pharmacySoftwareExperience: job.pharmacySoftwareExperience || "",
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
    if (!String(formData.jobCategory || "").trim()) missingFields.push("Job category");
    if (!String(formData.department || "").trim()) missingFields.push("Department");
    if (!String(formData.facilityType || "").trim()) missingFields.push("Facility type");
    if (!String(formData.county || "").trim()) missingFields.push("County");
    if (!String(formData.city || "").trim()) missingFields.push("City/Town");
    if (!String(formData.description || "").trim()) missingFields.push("Job description");
    if (!String(formData.responsibilities || "").trim()) missingFields.push("Roles and responsibilities");
    if (!String(formData.requirements || "").trim()) missingFields.push("Requirements");
    if (!String(formData.educationLevel || "").trim()) missingFields.push("Education level");
    if (!String(formData.employmentType || "").trim()) missingFields.push("Employment type");
    if (!String(formData.workSchedule || "").trim()) missingFields.push("Work schedule");
    if (!String(formData.applicationDeadline || "").trim()) missingFields.push("Application deadline");
    if (!String(formData.applicationMethod || "").trim()) missingFields.push("Application method");
    if ((Number(formData.requiredMedics) || 0) <= 0) missingFields.push("Available slots");

    if (missingFields.length) {
      showToast(`Please complete: ${missingFields.join(", ")}`, "warning");
      return;
    }

    saveMutation.mutate({
      title: formData.title,
      jobCategory: formData.jobCategory,
      description: formData.description,
      responsibilities: formData.responsibilities,
      requirements: formData.requirements,
      educationLevel: formData.educationLevel,
      licenseBody: formData.licenseBody,
      experienceYears: Number(formData.experienceYears) || 0,
      employmentType: formData.employmentType,
      workSchedule: formData.workSchedule,
      department: formData.department,
      specialization: formData.specialization,
      facilityType: formData.facilityType,
      county: formData.county,
      city: formData.city,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      applicationDeadline: formData.applicationDeadline,
      applicationMethod: formData.applicationMethod,
      applicationLink: formData.applicationLink || undefined,
      maxApplicants: Number(formData.maxApplicants) || 0,
      requiredDocuments: formData.requiredDocuments,
      drugDispensingExperience: formData.drugDispensingExperience || undefined,
      inventoryManagementExperience: formData.inventoryManagementExperience || undefined,
      pharmacySoftwareExperience: formData.pharmacySoftwareExperience || undefined,
      requiredMedics: Number(formData.requiredMedics) || 0,
      payType: formData.payType,
      payAmount: Number(formData.payAmount) || 0,
      salaryMin: Number(formData.salaryMin) || 0,
      salaryMax: Number(formData.salaryMax) || 0,
      location: formData.city || formData.county,
      hours: Number(formData.hours) || 0,
      qualifications: formData.qualifications,
      benefits: formData.benefits,
      shiftPattern: formData.shiftPattern,
      startDate: formData.startDate,
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
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Basic Job Information
          </Text>
          <Input
            label="Job Title"
            placeholder="e.g. Pharmacist"
            value={formData.title}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            required
          />

          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
            Job Category
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["Doctor", "Nurse", "Pharmacist", "Lab Technician", "Receptionist"].map((option) => {
              const active = formData.jobCategory === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, jobCategory: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Department"
            placeholder="e.g. Pharmacy"
            value={formData.department}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, department: value }))}
            required
          />

          <Input
            label="Specialization"
            placeholder="e.g. Pharmacy"
            value={formData.specialization}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, specialization: value }))}
            required
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Employer Information
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
            Facility Type
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["Hospital", "Clinic", "Pharmacy", "Laboratory"].map((option) => {
              const active = formData.facilityType === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, facilityType: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="County"
            placeholder="e.g. Nairobi"
            value={formData.county}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, county: value }))}
            required
          />

          <Input
            label="City / Town"
            placeholder="e.g. Westlands"
            value={formData.city}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, city: value }))}
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
            label="Roles & Responsibilities"
            placeholder="List the core responsibilities"
            value={formData.responsibilities}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, responsibilities: value }))}
            multiline
            numberOfLines={4}
            required
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Requirements
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
            Education Level
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["Certificate", "Diploma", "Degree", "Masters", "PhD"].map((option) => {
              const active = formData.educationLevel === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, educationLevel: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Professional License Body"
            placeholder="e.g. Pharmacy and Poisons Board"
            value={formData.licenseBody}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, licenseBody: value }))}
          />

          <Input
            label="Years of Experience"
            placeholder="e.g. 2"
            value={formData.experienceYears}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, experienceYears: value }))}
            keyboardType="numeric"
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
            label="Qualifications (Optional)"
            placeholder="Additional qualifications"
            value={formData.qualifications}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, qualifications: value }))}
            multiline
            numberOfLines={3}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Job Type
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["full_time", "part_time", "contract", "internship"].map((option) => {
              const active = formData.employmentType === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, employmentType: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["day", "night", "rotational"].map((option) => {
              const active = formData.workSchedule === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, workSchedule: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Shift Pattern (Optional)"
            placeholder="e.g. Rotational shift"
            value={formData.shiftPattern}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, shiftPattern: value }))}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Salary Information
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["monthly", "hourly", "negotiable"].map((option) => {
              const active = formData.payType === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, payType: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Min Salary (KES)"
                placeholder="e.g. 90000"
                value={formData.salaryMin}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, salaryMin: value }))}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Max Salary (KES)"
                placeholder="e.g. 120000"
                value={formData.salaryMax}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, salaryMax: value }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input
            label="Salary Amount (Optional)"
            placeholder="Use if a single value"
            value={formData.payAmount}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, payAmount: value }))}
            keyboardType="numeric"
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Application Settings
          </Text>
          <Input
            label="Application Deadline"
            placeholder="YYYY-MM-DD"
            value={formData.applicationDeadline}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, applicationDeadline: value }))}
            required
          />
          <Input
            label="Maximum Applicants"
            placeholder="e.g. 50"
            value={formData.maxApplicants}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, maxApplicants: value }))}
            keyboardType="numeric"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["medilink", "email", "link"].map((option) => {
              const active = formData.applicationMethod === option;
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
                  onPress={() => setFormData((prev) => ({ ...prev, applicationMethod: option }))}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                    {option === "medilink" ? "Apply via Medilink" : option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {formData.applicationMethod === "link" && (
            <Input
              label="Application Link"
              placeholder="https://"
              value={formData.applicationLink}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, applicationLink: value }))}
            />
          )}
          <Input
            label="Contact Email"
            placeholder="hr@facility.com"
            value={formData.contactEmail}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, contactEmail: value }))}
          />
          <Input
            label="Contact Phone"
            placeholder="+254..."
            value={formData.contactPhone}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, contactPhone: value }))}
          />

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Required Documents
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {["Professional License", "Academic Certificates", "ID/Passport", "Recommendation Letters"].map(
              (doc) => {
                const active = formData.requiredDocuments.includes(doc);
                return (
                  <TouchableOpacity
                    key={doc}
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
                        requiredDocuments: toggleListValue(prev.requiredDocuments, doc),
                      }))
                    }
                  >
                    <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                      {doc}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
            Pharmacy-specific Experience
          </Text>
          <Input
            label="Drug dispensing experience"
            placeholder="e.g. 2 years dispensing medicine"
            value={formData.drugDispensingExperience}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, drugDispensingExperience: value }))}
          />
          <Input
            label="Inventory management experience"
            placeholder="e.g. Stock control, procurement"
            value={formData.inventoryManagementExperience}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, inventoryManagementExperience: value }))}
          />
          <Input
            label="Pharmacy software experience"
            placeholder="e.g. Pharmasoft / Hospital ERP"
            value={formData.pharmacySoftwareExperience}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, pharmacySoftwareExperience: value }))}
          />

          <Input
            label="Benefits (Optional)"
            placeholder="e.g. Health insurance, housing"
            value={formData.benefits}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, benefits: value }))}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Start Date (Optional)"
            placeholder="YYYY-MM-DD"
            value={formData.startDate}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, startDate: value }))}
          />

          <Input
            label="Available Slots"
            placeholder="e.g. 3"
            value={formData.requiredMedics}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, requiredMedics: value }))}
            keyboardType="numeric"
            required
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
