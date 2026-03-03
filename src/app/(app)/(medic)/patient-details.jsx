import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MapPin, Phone, Pill, Paperclip } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { useToast } from "@/components/ToastProvider";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";

export default function PatientDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const params = useLocalSearchParams();
  const patientIdParam = Array.isArray(params?.patientId)
    ? params.patientId[0]
    : params?.patientId;
  const patientId = patientIdParam || "";
  const {
    isSuperAdmin,
    medicUserId,
    medics,
    setSelectedMedicUserId,
    isLoadingScope,
  } = useMedicScope();
  const medicId = medicUserId || auth?.user?.id;

  const [condition, setCondition] = useState("");
  const [prescription, setPrescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [prescribedMedicines, setPrescribedMedicines] = useState("");
  const [healthScore, setHealthScore] = useState("60");
  const [recoveryStatus, setRecoveryStatus] = useState("UNDER_TREATMENT");
  const [attachments, setAttachments] = useState([]);

  const healthStatusQuery = useQuery({
    queryKey: ["medic-patient-health-status", patientId],
    queryFn: () => apiClient.getPatientHealthStatus(patientId),
    enabled: Boolean(patientId),
  });

  useEffect(() => {
    if (!healthStatusQuery.data) return;
    const data = healthStatusQuery.data;
    const normalizedStatus =
      String(data.recoveryStatus || "").toUpperCase() === "RECOVERED"
        ? "RECOVERED"
        : "UNDER_TREATMENT";
    const normalizedScore =
      normalizedStatus === "RECOVERED" ? 100 : Number(data.healthScore || 60);
    setRecoveryStatus(normalizedStatus);
    setHealthScore(String(Math.max(0, Math.min(100, normalizedScore))));
  }, [healthStatusQuery.data]);

  const conditionMutation = useMutation({
    mutationFn: (payload) => apiClient.createConditionUpdate(payload),
    onSuccess: () => {
      showToast("Patient condition updated.", "success");
      setCondition("");
      setAttachments([]);
    },
    onError: (error) => {
      showToast(error.message || "Update failed.", "error");
    },
  });

  const prescriptionMutation = useMutation({
    mutationFn: (payload) => apiClient.createPrescription(payload),
    onSuccess: () => {
      showToast("Prescription sent to patient.", "success");
      setPrescription("");
      setAttachments([]);
    },
    onError: (error) => {
      showToast(error.message || "Prescription failed.", "error");
    },
  });
  const clinicalUpdateMutation = useMutation({
    mutationFn: (payload) => apiClient.createClinicalUpdate(payload),
    onSuccess: () => {
      showToast("Clinical record saved successfully.", "success");
      setDiagnosis("");
      setProgressNotes("");
      setHealthIssues("");
      setTreatmentPlan("");
      setPrescribedMedicines("");
      setAttachments([]);
    },
    onError: (error) => {
      showToast(error.message || "Failed to save clinical record.", "error");
    },
  });
  const healthStatusMutation = useMutation({
    mutationFn: (payload) => apiClient.updatePatientHealthStatus(patientId, payload),
    onSuccess: (response) => {
      const nextScore = Number(response?.healthScore || 60);
      const nextStatus =
        String(response?.recoveryStatus || "").toUpperCase() === "RECOVERED"
          ? "RECOVERED"
          : "UNDER_TREATMENT";
      setRecoveryStatus(nextStatus);
      setHealthScore(String(nextStatus === "RECOVERED" ? 100 : nextScore));
      healthStatusQuery.refetch();
      showToast("Patient health status updated.", "success");
    },
    onError: (error) => {
      showToast(error.message || "Failed to update patient health status.", "error");
    },
  });

  const handleUpdate = () => {
    if (!patientId || !medicId || !condition.trim()) {
      showToast("Please enter a condition update.", "warning");
      return;
    }
    conditionMutation.mutate({
      patient_id: patientId,
      medic_id: medicId,
      condition: condition.trim(),
      attachments: attachments.map((item) => ({
        name: item.name,
        url: item.url,
      })),
    });
  };

  const handlePrescription = () => {
    if (!patientId || !medicId || !prescription.trim()) {
      showToast("Please enter a prescription.", "warning");
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
      })),
    });
  };
  const handleSaveClinicalUpdate = () => {
    if (!patientId || !medicId) {
      showToast("Missing patient or medic details.", "warning");
      return;
    }

    const hasClinicalContent =
      diagnosis.trim() ||
      progressNotes.trim() ||
      healthIssues.trim() ||
      treatmentPlan.trim() ||
      prescribedMedicines.trim();
    if (!hasClinicalContent) {
      showToast("Enter at least one clinical detail before saving.", "warning");
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
      })),
    });
  };

  const handleSaveHealthStatus = () => {
    if (!patientId) {
      showToast("Missing patient details.", "warning");
      return;
    }
    const parsedScore = Number(healthScore);
    const safeScore = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(100, Math.round(parsedScore)))
      : 60;
    const isRecovered = recoveryStatus === "RECOVERED" || safeScore >= 100;
    healthStatusMutation.mutate({
      healthScore: isRecovered ? 100 : safeScore,
      recoveryStatus: isRecovered ? "RECOVERED" : "UNDER_TREATMENT",
      recovered: isRecovered,
      medicId,
      note: isRecovered
        ? "Patient marked as recovered."
        : `Health score set to ${safeScore}%.`,
    });
  };

  const handleAddAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: "*/*",
    });
    if (result.canceled) return;

    const files = result.assets || [];
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const payload = {
            uri: file.uri,
            name: file.name || "attachment",
            type: file.mimeType || "application/octet-stream",
          };
          const response = await apiClient.uploadFile(payload);
          return {
            name: file.name || "attachment",
            url: response?.url,
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
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Patient #{patientId}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <MedicScopeSelector
            visible={isSuperAdmin}
            medics={medics}
            selectedMedicId={medicId}
            onSelect={setSelectedMedicUserId}
            loading={isLoadingScope}
          />
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Emergency Contact
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Phone color={theme.textSecondary} size={14} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginLeft: 6,
                }}
              >
                Not linked
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Patient Location
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin color={theme.textSecondary} size={14} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginLeft: 6,
                }}
              >
                Location not set
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 10,
              }}
            >
              Patient Health Score
            </Text>
            <Input
              label="Health Score (0 - 100)"
              value={healthScore}
              onChangeText={setHealthScore}
              placeholder="e.g. 75"
              keyboardType="numeric"
            />
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor:
                    recoveryStatus === "UNDER_TREATMENT"
                      ? `${theme.warning}20`
                      : theme.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    recoveryStatus === "UNDER_TREATMENT"
                      ? theme.warning
                      : theme.border,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={() => setRecoveryStatus("UNDER_TREATMENT")}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      recoveryStatus === "UNDER_TREATMENT"
                        ? theme.warning
                        : theme.textSecondary,
                  }}
                >
                  Under Treatment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor:
                    recoveryStatus === "RECOVERED"
                      ? `${theme.success}20`
                      : theme.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    recoveryStatus === "RECOVERED"
                      ? theme.success
                      : theme.border,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={() => {
                  setRecoveryStatus("RECOVERED");
                  setHealthScore("100");
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      recoveryStatus === "RECOVERED"
                        ? theme.success
                        : theme.textSecondary,
                  }}
                >
                  Recovered
                </Text>
              </TouchableOpacity>
            </View>
            <Button
              title="Save Health Status"
              onPress={handleSaveHealthStatus}
              loading={healthStatusMutation.isLoading || healthStatusQuery.isLoading}
            />
          </View>

          <Input
            label="Update Condition"
            value={condition}
            onChangeText={setCondition}
            placeholder="e.g. Improving"
          />
          <Button
            title="Add Attachment"
            onPress={handleAddAttachment}
            variant="outline"
            leftIcon={Paperclip}
            style={{ marginBottom: 12 }}
          />
          {attachments.length > 0 && (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Attachments
              </Text>
              {attachments.map((file, index) => (
                <Text
                  key={`${file.url}-${index}`}
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.text,
                  }}
                >
                  • {file.name}
                </Text>
              ))}
            </View>
          )}
          <Button
            title="Update Condition"
            onPress={handleUpdate}
            loading={conditionMutation.isLoading}
          />

          <View style={{ height: 16 }} />

          <Input
            label="Prescription / Medication"
            value={prescription}
            onChangeText={setPrescription}
            placeholder="e.g. Amoxicillin 500mg"
            multiline
            numberOfLines={3}
          />
          <Button
            title="Send Prescription"
            onPress={handlePrescription}
            loading={prescriptionMutation.isLoading}
          />

          <View style={{ height: 20 }} />

          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 10,
            }}
          >
            Full Clinical Record
          </Text>
          <Input
            label="Diagnosis"
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="e.g. Acute sinusitis"
          />
          <Input
            label="Progress Notes"
            value={progressNotes}
            onChangeText={setProgressNotes}
            placeholder="Patient response/progress"
            multiline
            numberOfLines={3}
          />
          <Input
            label="Health Issues / Findings"
            value={healthIssues}
            onChangeText={setHealthIssues}
            placeholder="Clinical findings, complications, risk factors"
            multiline
            numberOfLines={3}
          />
          <Input
            label="Treatment Plan"
            value={treatmentPlan}
            onChangeText={setTreatmentPlan}
            placeholder="Plan of care and follow-up"
            multiline
            numberOfLines={3}
          />
          <Input
            label="Prescribed Medicines (comma separated)"
            value={prescribedMedicines}
            onChangeText={setPrescribedMedicines}
            placeholder="Amoxicillin 500mg, Paracetamol 1g"
            multiline
            numberOfLines={3}
          />
          <Button
            title="Save Clinical Record"
            onPress={handleSaveClinicalUpdate}
            loading={clinicalUpdateMutation.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
