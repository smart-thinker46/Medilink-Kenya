import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Picker } from "@react-native-picker/picker";
import { ArrowLeft, Briefcase, Clock, MapPin, Users, Filter } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";

export default function SharedJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();
  const userId = String(auth?.user?.id || "");
  const isMedic = role === "MEDIC";

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [employerFilter, setEmployerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const jobsQuery = useQuery({
    queryKey: [
      "jobs",
      "shared",
      searchQuery,
      locationFilter,
      specializationFilter,
      employerFilter,
    ],
    queryFn: () =>
      apiClient.getJobs({
        search: searchQuery || undefined,
        location: locationFilter || undefined,
        specialization: specializationFilter || undefined,
        employer: employerFilter || undefined,
      }),
  });

  const jobs = jobsQuery.data?.items || jobsQuery.data || [];

  const filterOptions = useMemo(() => {
    const unique = (items) => [...new Set(items.filter(Boolean))];
    return {
      locations: unique(jobs.map((job) => job.location || job.area || "")),
      specializations: unique(jobs.map((job) => job.specialization || job.category || "")),
      employers: unique(jobs.map((job) => job.employerName || job.hospitalName || "")),
    };
  }, [jobs]);

  const applyMutation = useMutation({
    mutationFn: (jobId) => apiClient.applyToJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      showToast("Application sent.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to apply.", "error");
    },
  });

  const unapplyMutation = useMutation({
    mutationFn: (jobId) => apiClient.cancelJobApplication(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "shared"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      showToast("Application removed.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to remove application.", "error");
    },
  });

  const hasApplied = (job) => {
    const applications = Array.isArray(job?.applications) ? job.applications : [];
    return applications.some((item) => String(item?.medicId || "") === userId);
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
            marginBottom: 16,
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
            Jobs
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
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
              placeholder="Search jobs, specializations, employer, location"
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
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 8 }}>
                <Picker
                  selectedValue={employerFilter}
                  onValueChange={(value) => setEmployerFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All employers" value="" />
                  {filterOptions.employers.map((option) => (
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}
          renderItem={({ item }) => {
            const appliedCount = Array.isArray(item?.applications) ? item.applications.length : 0;
            const applied = hasApplied(item);
            return (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_700Bold",
                    color: theme.text,
                    marginBottom: 6,
                  }}
                >
                  {item.title || item.task || "Open Job"}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Briefcase color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>
                    {item.employerName || item.hospitalName || "Employer not specified"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <MapPin color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>
                    {item.location || "Location not specified"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Clock color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>
                    {item.hours || 0} hrs
                  </Text>
                  <Users color={theme.iconColor} size={14} style={{ marginLeft: 12 }} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>
                    {item.requiredMedics || 0} needed
                  </Text>
                </View>

                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {item.specialization || "General"}
                  {" • "}
                  {item.payType === "per_hour" ? "Per hour" : "Total"}: KES {Number(item.payAmount || 0).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>
                  Applications: {appliedCount}
                </Text>

                {isMedic ? (
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor: applied ? "#EEF2FF" : theme.primary,
                    }}
                    onPress={() =>
                      applied
                        ? unapplyMutation.mutate(item.id)
                        : applyMutation.mutate(item.id)
                    }
                    disabled={applyMutation.isLoading || unapplyMutation.isLoading}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: applied ? theme.primary : "#FFFFFF",
                      }}
                    >
                      {applied ? "Remove Application" : "Apply"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor: theme.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        color: theme.textSecondary,
                      }}
                    >
                      Medics can apply from this section.
                    </Text>
                  </View>
                )}
              </View>
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
                No jobs available at the moment.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
