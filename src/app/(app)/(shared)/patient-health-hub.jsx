import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Shield, Paperclip } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { getFirstName } from "@/utils/greeting";
import { uploadFileIfNeeded } from "@/utils/upload";
import { resolveMediaUrl } from "@/utils/media";

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
  const { showToast } = useToast();
  const role = String(auth?.user?.role || "").toUpperCase();

  const patientIdParam = Array.isArray(params?.patientId)
    ? params.patientId[0]
    : params?.patientId;
  const patientId = String(patientIdParam || "").trim();
  const patientParams = patientId ? { patientId } : {};

  const [medicationCheckInput, setMedicationCheckInput] = useState("");
  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationTimes, setNewMedicationTimes] = useState([]);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState(new Date());
  const [newMedicationPills, setNewMedicationPills] = useState("");
  const [vitalSystolic, setVitalSystolic] = useState("");
  const [vitalDiastolic, setVitalDiastolic] = useState("");
  const [vitalSugar, setVitalSugar] = useState("");
  const [formFilter, setFormFilter] = useState("all");
  const [condition, setCondition] = useState("");
  const [prescription, setPrescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [prescribedMedicines, setPrescribedMedicines] = useState("");
  const [attachments, setAttachments] = useState([]);
  const canEditForms = ["MEDIC", "HOSPITAL_ADMIN", "SUPER_ADMIN"].includes(role);
  const canEditCarePlan = ["MEDIC", "HOSPITAL_ADMIN", "SUPER_ADMIN"].includes(role);
  const medicId = auth?.user?.id;

  const patientDashboardQuery = useQuery({
    queryKey: ["patient-dashboard-insights", patientId || "self"],
    queryFn: () => apiClient.getPatientDashboard(patientParams),
  });
  const medicalRecordsQuery = useQuery({
    queryKey: ["medical-records", patientId || "self", "health-hub"],
    queryFn: () => apiClient.getMedicalRecords(patientId || undefined),
    enabled: Boolean(patientId || role === "PATIENT"),
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
      setNewMedicationTimes([]);
      setNewMedicationPills("");
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

  const formatTimeLabel = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const addMedicationTime = (date) => {
    if (!date) return;
    const label = formatTimeLabel(date);
    setNewMedicationTimes((current) =>
      current.includes(label) ? current : [...current, label],
    );
  };

  const conditionMutation = useMutation({
    mutationFn: (payload) => apiClient.createConditionUpdate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records", patientId || "self", "health-hub"] });
      setCondition("");
      setAttachments([]);
      showToast("Condition update saved.", "success");
    },
    onError: (error) => showToast(error?.message || "Failed to save condition.", "error"),
  });

  const prescriptionMutation = useMutation({
    mutationFn: (payload) => apiClient.createPrescription(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records", patientId || "self", "health-hub"] });
      setPrescription("");
      setAttachments([]);
      showToast("Prescription saved.", "success");
    },
    onError: (error) => showToast(error?.message || "Failed to save prescription.", "error"),
  });

  const clinicalUpdateMutation = useMutation({
    mutationFn: (payload) => apiClient.createClinicalUpdate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records", patientId || "self", "health-hub"] });
      setDiagnosis("");
      setProgressNotes("");
      setHealthIssues("");
      setTreatmentPlan("");
      setPrescribedMedicines("");
      setAttachments([]);
      showToast("Clinical update saved.", "success");
    },
    onError: (error) => showToast(error?.message || "Failed to save clinical update.", "error"),
  });

  const handleAddAttachment = async () => {
    if (!canEditForms) {
      showToast("Only medics can upload attachments here.", "warning");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: "*/*",
    });
    if (result.canceled) return;
    const files = result.assets || [];
    const maxBytes = 4 * 1024 * 1024;
    const accepted = [];
    const rejected = [];
    files.forEach((file) => {
      const name = String(file.name || "attachment");
      const ext = name.split(".").pop()?.toLowerCase() || "";
      const mime = String(file.mimeType || "").toLowerCase();
      const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext);
      const isPdf = mime === "application/pdf" || ext === "pdf";
      const size = Number(file.size || 0);
      const sizeKnown = Number.isFinite(size) && size > 0;
      const reasons = [];
      if (!(isImage || isPdf)) reasons.push("Only images or PDFs are allowed");
      if (sizeKnown && size > maxBytes) reasons.push("File is larger than 4MB");
      if (reasons.length) {
        rejected.push({ name, reasons });
      } else {
        accepted.push(file);
      }
    });
    if (rejected.length) {
      const message = rejected
        .map((item) => `• ${item.name}: ${item.reasons.join(", ")}`)
        .join("\n");
      Alert.alert("Attachments rejected", message);
    }
    if (accepted.length === 0) {
      showToast("No valid attachments selected.", "warning");
      return;
    }
    try {
      const uploaded = await Promise.all(
        accepted.map(async (file) => {
          const kind = String(file.mimeType || "").startsWith("image/") ? "image" : "document";
          const url = await uploadFileIfNeeded(
            {
              uri: file.uri,
              name: file.name || "attachment",
              type: file.mimeType || "application/octet-stream",
            },
            { kind },
          );
          return {
            name: file.name || "attachment",
            url,
            size: file.size,
          };
        }),
      );
      setAttachments((prev) => [...prev, ...uploaded.filter((item) => item.url)]);
      showToast("Attachment uploaded.", "success");
    } catch (error) {
      showToast(error.message || "Attachment upload failed.", "error");
    }
  };

  const handleOpenAttachment = async (file) => {
    const url = resolveMediaUrl(file?.url);
    if (!url) {
      showToast("Attachment link is unavailable.", "warning");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      showToast("Unable to open this file.", "error");
    }
  };

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
  const medicalRecords = medicalRecordsQuery.data?.items || medicalRecordsQuery.data || [];
  const treatmentForms = medicalRecords.filter((record) =>
    ["condition", "prescription", "clinical_update"].includes(String(record?.type || "").toLowerCase()),
  );
  const formFilters = [
    { id: "all", label: "All", types: null },
    { id: "condition", label: "Update Condition", types: ["condition"] },
    { id: "prescription", label: "Prescription / Medication", types: ["prescription"] },
    { id: "clinical_update", label: "Full Clinical Record", types: ["clinical_update"] },
  ];
  const filteredForms =
    formFilter === "all"
      ? treatmentForms
      : treatmentForms.filter((record) =>
          (formFilters.find((item) => item.id === formFilter)?.types || []).includes(
            String(record?.type || "").toLowerCase(),
          ),
        );

  const getRecordMeta = (record, kind) => {
    const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
    return attachments.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        String(item.kind || "") === kind,
    );
  };

  const parseNotesField = (notes, prefix) => {
    const line = String(notes || "")
      .split("\n")
      .find((row) => row.toLowerCase().startsWith(prefix));
    if (!line) return "";
    return line.replace(new RegExp(`^${prefix}`, "i"), "").trim();
  };

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
          {(carePlan?.medications || []).slice(0, 4).map((med) => {
            const timesArray = Array.isArray(med?.takeTimes)
              ? med.takeTimes.filter(Boolean)
              : [];
            const takeTime =
              timesArray.length > 0
                ? timesArray.join(", ")
                : med?.takeTime ||
                  med?.time ||
                  (med?.nextDoseAt ? new Date(med.nextDoseAt).toLocaleString() : "");
            const pillsPerDose =
              med?.pillsPerDose ?? med?.pills ?? med?.dosage ?? "";
            return (
              <View key={med.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{med.name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Take time: {takeTime || "Not set"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Pills per dose: {pillsPerDose || "Not set"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
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
            );
          })}
          {(!carePlan?.medications || carePlan.medications.length === 0) && (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>No medications in this plan yet.</Text>
          )}
          {canEditCarePlan ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <TextInput
                  value={newMedicationName}
                  onChangeText={setNewMedicationName}
                  placeholder="Medication name"
                  placeholderTextColor={theme.textSecondary}
                  style={{
                    flex: 1,
                    minWidth: 180,
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
                  onPress={() => setTimePickerVisible(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    justifyContent: "center",
                    backgroundColor: theme.surface,
                    height: 40,
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    Add time
                  </Text>
                </TouchableOpacity>
                <TextInput
                  value={newMedicationPills}
                  onChangeText={setNewMedicationPills}
                  placeholder="Pills per dose"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  style={{
                    width: 130,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    height: 40,
                    paddingHorizontal: 10,
                    color: theme.text,
                    backgroundColor: theme.surface,
                  }}
                />
              </View>
              {newMedicationTimes.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {newMedicationTimes.map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() =>
                        setNewMedicationTimes((current) => current.filter((entry) => entry !== time))
                      }
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: theme.surface,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
                    Tap a time to remove.
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  const name = newMedicationName.trim();
                  const pillsValue = Number(newMedicationPills);
                  if (!name) {
                    Alert.alert("Care Plan", "Enter medication name.");
                    return;
                  }
                  if (newMedicationTimes.length === 0) {
                    Alert.alert("Care Plan", "Add at least one time.");
                    return;
                  }
                  if (!Number.isFinite(pillsValue) || pillsValue <= 0) {
                    Alert.alert("Care Plan", "Enter a valid pills per dose amount.");
                    return;
                  }
                  addMedicationMutation.mutate({
                    name,
                    takeTimes: newMedicationTimes,
                    pillsPerDose: pillsValue,
                  });
                }}
                style={{
                  marginTop: 10,
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Add</Text>
              </TouchableOpacity>
              {timePickerVisible && (
                <View>
                  <DateTimePicker
                    value={timePickerValue}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      if (event?.type === "dismissed" || !date) {
                        setTimePickerVisible(false);
                        return;
                      }
                      if (Platform.OS === "ios") {
                        setTimePickerValue(date);
                        return;
                      }
                      setTimePickerVisible(false);
                      setTimePickerValue(date);
                      addMedicationTime(date);
                    }}
                  />
                  {Platform.OS === "ios" && (
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          addMedicationTime(timePickerValue);
                          setTimePickerVisible(false);
                        }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: theme.primary,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
              Care plan medications are managed by the assigned medic or hospital.
            </Text>
          )}
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

        {canEditForms && (
          <Section title="Medic Treatment Forms" theme={theme}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 10 }}>
              Fill in treatment forms to update the patient record.
            </Text>
            <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>
              Update Condition
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: theme.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 8,
                paddingHorizontal: 12,
                marginBottom: 10,
              }}
              onPress={handleAddAttachment}
            >
              <Paperclip color={theme.iconColor} size={16} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Add Attachment (optional)
              </Text>
            </TouchableOpacity>
            {attachments.length > 0 && (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 6 }}>
                  Attachments:
                </Text>
                {attachments.map((file, index) => (
                  <Text key={`${file.url}-${index}`} style={{ color: theme.text, fontSize: 12 }}>
                    • {file.name}
                  </Text>
                ))}
              </View>
            )}
            <TextInput
              placeholder="Describe the condition update"
              placeholderTextColor={theme.textSecondary}
              value={condition}
              onChangeText={setCondition}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                marginBottom: 14,
              }}
              onPress={() => {
                if (!patientId || !medicId || !condition.trim()) {
                  Alert.alert("Update Condition", "Enter a condition update first.");
                  return;
                }
                conditionMutation.mutate({
                  patient_id: patientId,
                  medic_id: medicId,
                  condition: condition.trim(),
                  attachments: attachments.map((item) => ({
                    name: item.name,
                    url: item.url,
                    size: item.size,
                  })),
                });
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Save Update Condition
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>
              Prescription / Medication
            </Text>
            <TextInput
              placeholder="Prescription / Medication"
              placeholderTextColor={theme.textSecondary}
              value={prescription}
              onChangeText={setPrescription}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                marginBottom: 14,
              }}
              onPress={() => {
                if (!patientId || !medicId || !prescription.trim()) {
                  Alert.alert("Prescription / Medication", "Enter a prescription first.");
                  return;
                }
                prescriptionMutation.mutate({
                  patient_id: patientId,
                  medic_id: medicId,
                  prescription: prescription.trim(),
                  medications: prescription
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  attachments: attachments.map((item) => ({
                    name: item.name,
                    url: item.url,
                    size: item.size,
                  })),
                });
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Save Prescription / Medication
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>
              Full Clinical Record
            </Text>
            <TextInput
              placeholder="Diagnosis"
              placeholderTextColor={theme.textSecondary}
              value={diagnosis}
              onChangeText={setDiagnosis}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Progress notes"
              placeholderTextColor={theme.textSecondary}
              value={progressNotes}
              onChangeText={setProgressNotes}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Health issues / findings"
              placeholderTextColor={theme.textSecondary}
              value={healthIssues}
              onChangeText={setHealthIssues}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Treatment plan"
              placeholderTextColor={theme.textSecondary}
              value={treatmentPlan}
              onChangeText={setTreatmentPlan}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Prescribed medicines (comma separated)"
              placeholderTextColor={theme.textSecondary}
              value={prescribedMedicines}
              onChangeText={setPrescribedMedicines}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                marginBottom: 10,
              }}
            />
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
              }}
              onPress={() => {
                if (!patientId || !medicId) {
                  Alert.alert("Full Clinical Record", "Missing patient or medic details.");
                  return;
                }
                const hasClinicalContent =
                  diagnosis.trim() ||
                  progressNotes.trim() ||
                  healthIssues.trim() ||
                  treatmentPlan.trim() ||
                  prescribedMedicines.trim();
                if (!hasClinicalContent) {
                  Alert.alert("Full Clinical Record", "Enter at least one detail.");
                  return;
                }
                clinicalUpdateMutation.mutate({
                  patient_id: patientId,
                  medic_id: medicId,
                  diagnosis: diagnosis.trim(),
                  progress: progressNotes.trim(),
                  healthIssues: healthIssues.trim(),
                  treatmentPlan: treatmentPlan.trim(),
                  prescribedMedicines: prescribedMedicines
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  attachments: attachments.map((item) => ({
                    name: item.name,
                    url: item.url,
                    size: item.size,
                  })),
                });
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Save Full Clinical Record
              </Text>
            </TouchableOpacity>
          </Section>
        )}

        <Section title="Treatment Forms" theme={theme}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {formFilters.map((filter) => {
                const active = formFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setFormFilter(filter.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : theme.textSecondary,
                        fontSize: 11,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          {filteredForms.length === 0 ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              No treatment forms for this filter.
            </Text>
          ) : (
            filteredForms.slice(0, 6).map((record) => {
              const type = String(record.type || "").toLowerCase();
              const createdAt = record.createdAt ? new Date(record.createdAt).toLocaleString() : "";
              const medicName = record.medic?.fullName || "Medic";
              const clinicalMeta = getRecordMeta(record, "clinical_meta");
              const prescriptionMeta = getRecordMeta(record, "prescription_meta");
              const medications =
                Array.isArray(prescriptionMeta?.medications) && prescriptionMeta.medications.length
                  ? prescriptionMeta.medications
                  : String(record.notes || "")
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
              const diagnosis =
                clinicalMeta?.diagnosis ||
                parseNotesField(record.notes, "Diagnosis:");
              const progress =
                clinicalMeta?.progress ||
                parseNotesField(record.notes, "Progress:");
              const healthIssues =
                clinicalMeta?.healthIssues ||
                parseNotesField(record.notes, "Health Issues:");
              const treatmentPlan =
                clinicalMeta?.treatmentPlan ||
                parseNotesField(record.notes, "Treatment Plan:");
              const prescribedMedicines =
                Array.isArray(clinicalMeta?.prescribedMedicines) && clinicalMeta.prescribedMedicines.length
                  ? clinicalMeta.prescribedMedicines
                  : parseNotesField(record.notes, "Prescribed medicines:")
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);

              return (
                <View
                  key={record.id}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                    {type === "prescription"
                      ? "Prescription / Medication"
                      : type === "condition"
                        ? "Update Condition"
                        : "Full Clinical Record"}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    {medicName} {createdAt ? `• ${createdAt}` : ""}
                  </Text>
                  {type === "condition" && (
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                      {record.condition || record.notes || "Condition update recorded."}
                    </Text>
                  )}
                  {type === "prescription" && (
                    <View style={{ marginTop: 6 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        Medications: {medications.length ? medications.join(", ") : "Not specified"}
                      </Text>
                      {(prescriptionMeta?.dosage || prescriptionMeta?.frequency || prescriptionMeta?.duration) && (
                        <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                          {prescriptionMeta?.dosage ? `Dosage: ${prescriptionMeta.dosage}` : ""}
                          {prescriptionMeta?.frequency ? ` • Frequency: ${prescriptionMeta.frequency}` : ""}
                          {prescriptionMeta?.duration ? ` • Duration: ${prescriptionMeta.duration}` : ""}
                        </Text>
                      )}
                    </View>
                  )}
                  {type === "clinical_update" && (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      {diagnosis ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Diagnosis: {diagnosis}</Text>
                      ) : null}
                      {progress ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Progress: {progress}</Text>
                      ) : null}
                      {healthIssues ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Issues: {healthIssues}</Text>
                      ) : null}
                      {treatmentPlan ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          Treatment Plan: {treatmentPlan}
                        </Text>
                      ) : null}
                      {prescribedMedicines.length ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          Prescribed: {prescribedMedicines.join(", ")}
                        </Text>
                      ) : null}
                      {!diagnosis && !progress && !healthIssues && !treatmentPlan && !prescribedMedicines.length ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {record.notes || "Clinical update recorded."}
                        </Text>
                      ) : null}
                    </View>
                  )}
                  {Array.isArray(record?.attachments) &&
                    record.attachments.filter((file) => file?.url).length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 6 }}>
                          Attachments
                        </Text>
                        {record.attachments
                          .filter((file) => file?.url)
                          .slice(0, 3)
                          .map((file, idx) => (
                            <TouchableOpacity
                              key={`${record.id}-att-${idx}`}
                              onPress={() => handleOpenAttachment(file)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                backgroundColor: theme.surface,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: theme.border,
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                marginBottom: 6,
                              }}
                            >
                              <Paperclip color={theme.iconColor} size={14} />
                              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                {file.name || "Attachment"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                </View>
              );
            })
          )}
          {filteredForms.length > 6 && (
            <TouchableOpacity
              onPress={() => router.push("/(app)/(patient)/medical-history")}
              style={{ marginTop: 10, alignSelf: "flex-start" }}
            >
              <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                View all treatment forms
              </Text>
            </TouchableOpacity>
          )}
        </Section>
      </ScrollView>
    </ScreenLayout>
  );
}
