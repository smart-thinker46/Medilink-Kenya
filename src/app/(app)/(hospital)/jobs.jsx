import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Users, ArrowLeft, Filter, Edit3, XCircle, Trash2, Building2, Calendar } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";

const parseJobDetails = (specifications) => {
  if (!specifications) return {};
  if (typeof specifications === "object") return specifications;
  try {
    const parsed = JSON.parse(specifications);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export default function HospitalJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useHospitalProfile();
  const completion = useMemo(() => getHospitalProfileCompletion(profile), [profile]);
  const isProfileComplete = completion.percent >= 99;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);

  const jobsQuery = useQuery({
    queryKey: ["jobs", "hospital", searchQuery, statusFilter, locationFilter, specializationFilter],
    queryFn: () =>
      apiClient.getJobs({
        mine: true,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        location: locationFilter || undefined,
        specialization: specializationFilter || undefined,
      }),
  });

  const jobs = jobsQuery.data?.items || jobsQuery.data || [];

  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    return {
      locations: unique(jobs.map((job) => job.location || job.area || "")),
      specializations: unique(jobs.map((job) => job.specialization || job.category || "")),
    };
  }, [jobs]);

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => apiClient.cancelJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => apiClient.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
    },
  });

  const approveApplicationMutation = useMutation({
    mutationFn: ({ jobId, medicId }) => apiClient.approveJobApplication(jobId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      showToast("Application approved.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Approve failed.", "error");
    },
  });

  const hireApplicationMutation = useMutation({
    mutationFn: ({ jobId, medicId }) => apiClient.hireJobApplication(jobId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      queryClient.invalidateQueries({ queryKey: ["medics", "hired"] });
      showToast("Medic hired.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Hire failed.", "error");
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: ({ jobId, medicId }) => apiClient.rejectJobApplication(jobId, medicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "hospital"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      showToast("Application denied.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Deny failed.", "error");
    },
  });

  const handleCreateJob = () => {
    if (!isProfileComplete) {
      Alert.alert(
        "Complete Hospital Profile",
        "Please complete at least 99% of your hospital profile before posting jobs.",
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
    router.push("/(app)/(hospital)/job-create");
  };

  const handleEditJob = (job) => {
    router.push({
      pathname: "/(app)/(hospital)/job-create",
      params: { jobId: job.id },
    });
  };

  const handleCancelJob = (job) => {
    Alert.alert("Cancel job", "Applied medics will be notified in app and by email.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => cancelMutation.mutate({ id: job.id }),
      },
    ]);
  };

  const handleDeleteJob = (job) => {
    Alert.alert("Delete job", "This action is permanent.", [
      { text: "No", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: job.id }),
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
              Jobs
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
            onPress={handleCreateJob}
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
              placeholder="Search by title, department, specialization or location"
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
          data={jobs}
          keyExtractor={(item, index) => item.id || `job-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const appliedCount = Array.isArray(item?.applications) ? item.applications.length : 0;
            const applications = Array.isArray(item?.applications) ? item.applications : [];
            const approvedCount = applications.filter(
              (app) => ["APPROVED", "HIRED"].includes(String(app?.status || "").toUpperCase()),
            ).length;
            const requiredSlots = Number(item?.requiredMedics || 0);
            const isExpanded = expandedJobId === item.id;
            const details = item?.jobDetails || parseJobDetails(item?.specifications);
            const jobTypeText = String(item.jobType || details.jobType || "N/A").split("_").join(" ");
            const isContract =
              String(item.jobType || details.jobType || "").toLowerCase() === "contract";
            const contractPeriod = String(item.shiftPattern || details.shiftPattern || "").trim();
            const jobTypeKey = String(item.jobType || details.jobType || "").toLowerCase();
            const jobTypeTone =
              jobTypeKey === "full_time"
                ? theme.success
                : jobTypeKey === "part_time"
                  ? theme.info
                  : jobTypeKey === "contract"
                    ? theme.warning
                    : jobTypeKey === "internship"
                      ? theme.accent
                      : jobTypeKey === "attachment"
                        ? theme.primary
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
                      setExpandedJobId((prev) => (prev === item.id ? null : item.id))
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
                      {item.title || "Open Job"}
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

                  <Text style={{ marginTop: 6, fontSize: 11, color: theme.textTertiary }}>
                    {isExpanded ? "Tap title to collapse details" : "Tap title to view full details"}
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: `${jobTypeTone}55`,
                        backgroundColor: `${jobTypeTone}15`,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: jobTypeTone, fontFamily: "Inter_600SemiBold" }}>
                        Type: {jobTypeText}
                      </Text>
                    </View>
                    {isContract && contractPeriod ? (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: `${theme.warning}55`,
                          backgroundColor: `${theme.warning}15`,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: theme.warning }}>
                          Contract: {contractPeriod}
                        </Text>
                      </View>
                    ) : null}
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
                      <Text style={{ fontSize: 11, color: slotsTone, fontFamily: "Inter_600SemiBold" }}>
                        Slots: {approvedCount}/{requiredSlots || "?"} approved
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setExpandedJobId((prev) => (prev === item.id ? null : item.id))}
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
                      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8 }}>
                        {item.description || "No summary provided"}
                      </Text>
                      <View style={{ marginTop: 12, gap: 6 }}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Category: {item.jobCategory || details.jobCategory || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Department: {item.department || details.department || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Facility: {item.facilityType || details.facilityType || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Location: {[item.county, item.city].filter(Boolean).join(", ") || item.location || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Job Type: {String(item.jobType || details.jobType || "N/A").split("_").join(" ")}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Schedule: {item.scheduleType || details.scheduleType || "N/A"}
                        </Text>
                        {(String(item.jobType || details.jobType || "").toLowerCase() === "contract" &&
                          (item.shiftPattern || details.shiftPattern)) ? (
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                            Contract Period: {item.shiftPattern || details.shiftPattern}
                          </Text>
                        ) : null}
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Experience: {item.experienceLevel || details.experienceLevel || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Education: {item.educationLevel || details.educationLevel || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          License: {item.licenseBody || details.licenseBody || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Years: {item.experienceYears || details.experienceYears || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Responsibilities: {item.responsibilities || details.responsibilities || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Qualifications: {item.qualifications || details.qualifications || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Benefits: {item.benefits || details.benefits || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Salary: {(() => {
                            const amount = Number(item.payAmount || details.payAmount || 0);
                            const payType = String(item.payType || item.salaryType || "").trim();
                            const payTypeLower = payType.toLowerCase();
                            if (Number.isFinite(amount) && amount > 0) return `KES ${amount}${payType ? ` ${payType}` : ""}`;
                            if (payTypeLower === "negotiable") return "Negotiable";
                            if (payType) return payType;
                            return "Not specified";
                          })()}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Application Method: {item.applicationMethod || details.applicationMethod || "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Required Docs: {Array.isArray(item.requiredDocuments) ? item.requiredDocuments.join(", ") : "N/A"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Contact: {item.contactEmail || details.contactEmail || "N/A"} {(item.contactPhone || details.contactPhone) ? `| ${item.contactPhone || details.contactPhone}` : ""}
                        </Text>
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
                                              jobId: item.id,
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
                                              jobId: item.id,
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
                                                    jobId: item.id,
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
                                                    jobId: item.id,
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
                                            jobId: item.id,
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

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                    <Building2 color={theme.textSecondary} size={14} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 6 }}>
                      {item.employerName || item.hospitalName || "Employer"}
                    </Text>
                    <Clock color={theme.textSecondary} size={14} style={{ marginLeft: 12 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 6 }}>
                      {item.hours || 0} hrs
                    </Text>
                    <Users color={theme.textSecondary} size={14} style={{ marginLeft: 12 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 6 }}>
                      {item.requiredMedics || 0} medics
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <Calendar color={theme.textSecondary} size={14} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 6 }}>
                      Deadline: {item.applicationDeadline || details.applicationDeadline || "Not set"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 12 }}>
                      Status: {String(item.status || "OPEN").toUpperCase()}
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
                      onPress={() => handleEditJob(item)}
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
                      onPress={() => handleCancelJob(item)}
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
                      onPress={() => handleDeleteJob(item)}
                    >
                      <Trash2 color="#C2410C" size={16} />
                      <Text style={{ marginLeft: 6, color: "#C2410C" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
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
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                No jobs posted yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
