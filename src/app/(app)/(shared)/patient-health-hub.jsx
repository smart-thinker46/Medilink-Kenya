import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Shield } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { getFirstName } from "@/utils/greeting";

function Section({ title, children, theme }) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 20,
          fontFamily: "Nunito_600SemiBold",
          color: theme.text,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function SharedPatientHealthHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();

  const patientIdParam = Array.isArray(params?.patientId)
    ? params.patientId[0]
    : params?.patientId;
  const patientId = String(patientIdParam || "").trim();
  const patientParams = patientId ? { patientId } : {};

  const [medicationCheckInput, setMedicationCheckInput] = useState("");
  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationDosage, setNewMedicationDosage] = useState("");
  const [vitalSystolic, setVitalSystolic] = useState("");
  const [vitalDiastolic, setVitalDiastolic] = useState("");
  const [vitalSugar, setVitalSugar] = useState("");

  const patientDashboardQuery = useQuery({
    queryKey: ["patient-dashboard-insights", patientId || "self"],
    queryFn: () => apiClient.getPatientDashboard(patientParams),
  });

  const addVitalsMutation = useMutation({
    mutationFn: (payload) => apiClient.addPatientVitals(payload, patientParams),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
      setVitalSystolic("");
      setVitalDiastolic("");
      setVitalSugar("");
      const alerts = result?.alerts || [];
      if (alerts.length > 0) {
        Alert.alert("Vitals saved", alerts[0]?.message || "Vitals saved successfully.");
      }
    },
    onError: (error) => {
      Alert.alert("Vitals", error?.message || "Failed to save vitals.");
    },
  });

  const medicationCheckMutation = useMutation({
    mutationFn: (payload) => apiClient.checkPatientMedicationSafety(payload, patientParams),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
      if (result?.safe) {
        Alert.alert("Medication Safety", "No critical interactions found.");
      } else {
        Alert.alert("Medication Safety", `${result?.interactions?.length || 0} interaction(s) detected.`);
      }
    },
    onError: (error) => {
      Alert.alert("Medication Safety", error?.message || "Could not check interactions.");
    },
  });

  const createShareMutation = useMutation({
    mutationFn: () => apiClient.createPatientHealthShare({ scope: "SUMMARY", expiresHours: 24 }, patientParams),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
      const share = result?.share || {};
      const tokenPreview = String(share?.token || "").slice(0, 16);
      const apiPath = String(share?.apiPath || share?.link || "").trim();
      const message = apiPath
        ? `Token: ${tokenPreview}...\nAPI: ${apiPath}\nValid for 24 hours.`
        : "Health share link generated for 24 hours.";
      Alert.alert("Share Link", message);
    },
    onError: (error) => {
      Alert.alert("Health Share", error?.message || "Could not create share link.");
    },
  });

  const addMedicationMutation = useMutation({
    mutationFn: (payload) => apiClient.addPatientCarePlanMedication(payload, patientParams),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
      setNewMedicationName("");
      setNewMedicationDosage("");
    },
    onError: (error) => {
      Alert.alert("Care Plan", error?.message || "Could not add medication.");
    },
  });

  const markTakenMutation = useMutation({
    mutationFn: (medicationId) => apiClient.markPatientMedicationTaken(medicationId, patientParams),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
    },
    onError: (error) => Alert.alert("Care Plan", error?.message || "Could not update medication."),
  });

  const markMissedMutation = useMutation({
    mutationFn: (medicationId) => apiClient.markPatientMedicationMissed(medicationId, patientParams),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard-insights", patientId || "self"] });
    },
    onError: (error) => Alert.alert("Care Plan", error?.message || "Could not update medication."),
  });

  const patientInsights = patientDashboardQuery.data || {};
  const carePlan = patientInsights.carePlan || {};
  const medicationSafety = patientInsights.medicationSafety || null;
  const emergencyCard = patientInsights.emergencyCard || {};
  const vitals = patientInsights.vitals || [];
  const insurance = patientInsights.insurance || {};
  const labs = patientInsights.labs || [];
  const timeline = patientInsights.timeline || [];
  const healthShare = patientInsights.healthShare || {};
  const careTeam = patientInsights.careTeam || {};
  const adherence = patientInsights.adherence || {};
  const preventiveReminders = patientInsights.preventiveReminders || [];
  const criticalAlerts = patientInsights.criticalAlerts || [];

  const headerName = useMemo(() => {
    const rawName = String(emergencyCard?.fullName || "").trim();
    if (rawName) return rawName;
    return getFirstName(auth?.user, "Patient");
  }, [emergencyCard?.fullName, auth?.user]);

  const canShare = role === "PATIENT" || role === "SUPER_ADMIN";
  const isEditingOther = Boolean(patientId) && role !== "PATIENT";

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
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
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.surface,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <ArrowLeft size={18} color={theme.iconColor} />
            </TouchableOpacity>
            <View>
              <Text style={{ color: theme.text, fontSize: 22, fontFamily: "Nunito_700Bold" }}>Health Hub</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{headerName}</Text>
            </View>
          </View>
          <Heart size={20} color={theme.primary} />
        </View>

        {isEditingOther && (
          <View
            style={{
              marginHorizontal: 24,
              marginBottom: 18,
              backgroundColor: `${theme.primary}12`,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: `${theme.primary}33`,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 12 }}>
              Editing Health Hub for {headerName}.
            </Text>
          </View>
        )}

        <Section title="My Care Plan" theme={theme}>
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
            Next follow-up:{" "}
            {carePlan?.nextFollowUp?.date || carePlan?.nextFollowUp?.createdAt
              ? new Date(carePlan?.nextFollowUp?.date || carePlan?.nextFollowUp?.createdAt).toLocaleDateString()
              : "Not scheduled"}
          </Text>
          {(carePlan?.medications || []).slice(0, 4).map((med) => (
            <View key={med.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{med.name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {med.dosage || "As prescribed"} • {med.frequency || "Schedule unavailable"}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                Taken: {Number(med?.takenCount || 0)} • Missed: {Number(med?.missedCount || 0)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  onPress={() => markTakenMutation.mutate(med.id)}
                  style={{ backgroundColor: theme.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Took</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => markMissedMutation.mutate(med.id)}
                  style={{ backgroundColor: theme.warning, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Missed</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {(!carePlan?.medications || carePlan.medications.length === 0) && (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>No medications in this plan yet.</Text>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TextInput
              value={newMedicationName}
              onChangeText={setNewMedicationName}
              placeholder="Medication name"
              placeholderTextColor={theme.textSecondary}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                height: 40,
                paddingHorizontal: 10,
                color: theme.text,
                backgroundColor: theme.surface,
              }}
            />
            <TextInput
              value={newMedicationDosage}
              onChangeText={setNewMedicationDosage}
              placeholder="Dosage"
              placeholderTextColor={theme.textSecondary}
              style={{
                width: 90,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                height: 40,
                paddingHorizontal: 10,
                color: theme.text,
                backgroundColor: theme.surface,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (!newMedicationName.trim()) {
                  Alert.alert("Care Plan", "Enter medication name.");
                  return;
                }
                addMedicationMutation.mutate({
                  name: newMedicationName.trim(),
                  dosage: newMedicationDosage.trim(),
                });
              }}
              style={{ backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Add</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title="Medication Safety" theme={theme}>
          <TextInput
            value={medicationCheckInput}
            onChangeText={setMedicationCheckInput}
            placeholder="Enter medications (comma separated)"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              height: 42,
              paddingHorizontal: 10,
              color: theme.text,
              backgroundColor: theme.surface,
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (!medicationCheckInput.trim()) {
                Alert.alert("Medication Safety", "Enter at least one medication.");
                return;
              }
              medicationCheckMutation.mutate({
                medications: medicationCheckInput
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              });
            }}
            style={{ marginTop: 10, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Check Interactions</Text>
          </TouchableOpacity>
          {medicationSafety && (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8 }}>
              Last check: {medicationSafety?.safe ? "Safe" : "Interactions found"} •{" "}
              {new Date(medicationSafety?.checkedAt || Date.now()).toLocaleString()}
            </Text>
          )}
        </Section>

        <Section title="Emergency Card" theme={theme}>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{emergencyCard?.fullName || headerName}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Blood Group: {emergencyCard?.bloodGroup || "Not set"}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Allergies: {emergencyCard?.allergies || "Not set"}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Emergency Contact: {emergencyCard?.emergencyContactName || "Not set"}{" "}
            {emergencyCard?.emergencyContactPhone ? `(${emergencyCard.emergencyContactPhone})` : ""}
          </Text>
        </Section>

        <Section title="Vitals & Symptom Tracker" theme={theme}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={vitalSystolic}
              onChangeText={setVitalSystolic}
              placeholder="Sys"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, height: 40, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.surface }}
            />
            <TextInput
              value={vitalDiastolic}
              onChangeText={setVitalDiastolic}
              placeholder="Dia"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, height: 40, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.surface }}
            />
            <TextInput
              value={vitalSugar}
              onChangeText={setVitalSugar}
              placeholder="Sugar"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, height: 40, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.surface }}
            />
          </View>
          <TouchableOpacity
            onPress={() =>
              addVitalsMutation.mutate({
                bloodPressureSystolic: vitalSystolic || undefined,
                bloodPressureDiastolic: vitalDiastolic || undefined,
                bloodSugar: vitalSugar || undefined,
              })
            }
            style={{ marginTop: 10, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Save Vitals</Text>
          </TouchableOpacity>
          {vitals.slice(0, 3).map((item) => (
            <Text key={item.id} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
              {new Date(item.recordedAt || Date.now()).toLocaleDateString()} • BP {item.bloodPressureSystolic || "-"} /{" "}
              {item.bloodPressureDiastolic || "-"} • Sugar {item.bloodSugar || "-"}
            </Text>
          ))}
        </Section>

        <Section title="Insurance / Payment Summary" theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Provider: {insurance?.provider || "Not linked"}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Coverage: {Number(insurance?.coveragePercent || 0)}%</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Covered: KES {Number(insurance?.coveredAmount || 0).toLocaleString()}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Out of pocket: KES {Number(insurance?.outOfPocketAmount || 0).toLocaleString()}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Pending claims: {Number(insurance?.claimsPending || 0)}</Text>
        </Section>

        <Section title="Lab & Imaging Results" theme={theme}>
          {labs.length === 0 ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No lab or imaging results yet.</Text>
          ) : (
            labs.slice(0, 4).map((item) => (
              <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{item.title}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.summary || "Result recorded"}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Visit Timeline" theme={theme}>
          {timeline.slice(0, 5).map((event) => (
            <View key={event.id} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{event.title}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{event.detail}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{new Date(event.date || Date.now()).toLocaleString()}</Text>
            </View>
          ))}
        </Section>

        {canShare && (
          <Section title="Secure Health Share" theme={theme}>
            <TouchableOpacity
              onPress={() => createShareMutation.mutate()}
              style={{ backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginBottom: 10 }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Generate 24h Share Link</Text>
            </TouchableOpacity>
            {(healthShare?.activeLinks || []).slice(0, 3).map((share) => (
              <Text key={share.id} style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                Token: {String(share.token || "").slice(0, 12)}... • Expires {new Date(share.expiresAt || Date.now()).toLocaleString()}
              </Text>
            ))}
            {(healthShare?.activeLinks || []).length === 0 && (
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No active share links.</Text>
            )}
          </Section>
        )}

        <Section title="Care Team" theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Medics: {(careTeam?.medics || []).length} • Hospitals: {(careTeam?.hospitals || []).length} • Pharmacies:{" "}
            {(careTeam?.pharmacies || []).length}
          </Text>
          {(careTeam?.medics || []).slice(0, 3).map((member) => (
            <Text key={`m-${member.id}`} style={{ color: theme.text, fontSize: 12, marginTop: 4 }}>
              Medic: {member.fullName || member.email || member.phone}
            </Text>
          ))}
          {(careTeam?.hospitals || []).slice(0, 2).map((member) => (
            <Text key={`h-${member.id}`} style={{ color: theme.text, fontSize: 12, marginTop: 4 }}>
              Hospital: {member.fullName || member.email || member.phone}
            </Text>
          ))}
        </Section>

        <Section title="Adherence Score" theme={theme}>
          <Text style={{ color: theme.text, fontSize: 24, fontFamily: "Nunito_700Bold" }}>
            {Math.max(0, Math.min(100, Number(adherence?.overallScore || 0)))}%
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Medication adherence: {Number(adherence?.medicationAdherence || 0).toFixed(1)}%
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Appointment adherence: {Number(adherence?.appointmentAdherence || 0).toFixed(1)}%
          </Text>
        </Section>

        <Section title="Preventive Care Reminders" theme={theme}>
          {preventiveReminders.length === 0 ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No preventive reminders at the moment.</Text>
          ) : (
            preventiveReminders.slice(0, 6).map((item) => (
              <Text key={item.id} style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 5 }}>
                • {item.title} ({item.due})
              </Text>
            ))
          )}
        </Section>

        <Section title="Critical Alerts" theme={theme}>
          {criticalAlerts.length === 0 ? (
            <Text style={{ color: theme.success, fontSize: 12 }}>No critical alerts right now.</Text>
          ) : (
            criticalAlerts.slice(0, 5).map((item, idx) => (
              <View
                key={`${item.title}-${idx}`}
                style={{
                  marginBottom: 8,
                  backgroundColor: item.severity === "HIGH" ? `${theme.error}1A` : `${theme.warning}1A`,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Shield size={14} color={item.severity === "HIGH" ? theme.error : theme.warning} />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: theme.text,
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.message}</Text>
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </ScreenLayout>
  );
}
