import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MapPin, Phone, ShieldCheck } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

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

  const [healthScore, setHealthScore] = useState("60");
  const [recoveryStatus, setRecoveryStatus] = useState("UNDER_TREATMENT");
  const [accessRequestNote, setAccessRequestNote] = useState("");
  const [additionalCharge, setAdditionalCharge] = useState("");
  const [additionalChargeNote, setAdditionalChargeNote] = useState("");

  const healthStatusQuery = useQuery({
    queryKey: ["medic-patient-health-status", patientId],
    queryFn: () => apiClient.getPatientHealthStatus(patientId),
    enabled: Boolean(patientId),
  });
  const accessStatusQuery = useQuery({
    queryKey: ["medical-record-access-status", patientId, medicId],
    queryFn: () => apiClient.getMedicalRecordAccessStatus(patientId),
    enabled: Boolean(patientId && medicId),
  });
  const requestAccessMutation = useMutation({
    mutationFn: (payload) => apiClient.requestMedicalRecordAccess(payload),
    onSuccess: (response) => {
      const status = String(response?.status || "").toUpperCase();
      if (status === "GRANTED") {
        showToast("You already have record access for this patient.", "success");
      } else {
        showToast("Access request sent to patient.", "success");
      }
      accessStatusQuery.refetch();
    },
    onError: (error) => {
      showToast(error.message || "Failed to request access.", "error");
    },
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

  const hasRecordAccess = isSuperAdmin || Boolean(accessStatusQuery.data?.granted);
  const isAccessPending = !hasRecordAccess && Boolean(accessStatusQuery.data?.pending);
  const patientRecordsQuery = useQuery({
    queryKey: ["medic-patient-records", patientId, medicId],
    queryFn: () => apiClient.getMedicalRecords(patientId),
    enabled: Boolean(patientId && hasRecordAccess),
  });
  const patientTimelineRecords = useMemo(() => {
    if (Array.isArray(patientRecordsQuery.data)) return patientRecordsQuery.data;
    if (Array.isArray(patientRecordsQuery.data?.items)) return patientRecordsQuery.data.items;
    return [];
  }, [patientRecordsQuery.data]);

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

  const paymentRequestMutation = useMutation({
    mutationFn: (payload) => apiClient.createPaymentRequest(payload),
    onSuccess: () => {
      showToast("Payment request sent to patient.", "success");
      setAdditionalCharge("");
      setAdditionalChargeNote("");
    },
    onError: (error) => {
      showToast(error.message || "Failed to send payment request.", "error");
    },
  });

  const handleRequestAdditionalCharge = () => {
    if (!hasRecordAccess) {
      showToast("Patient consent is required before requesting charges.", "warning");
      return;
    }
    const amount = Number(additionalCharge || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a valid additional charge amount.", "warning");
      return;
    }
    if (!patientId) {
      showToast("Missing patient details.", "warning");
      return;
    }
    paymentRequestMutation.mutate({
      patientId,
      amount,
      currency: "KES",
      description: additionalChargeNote?.trim() || "Additional charges",
    });
  };

  const handleSaveHealthStatus = () => {
    if (!hasRecordAccess) {
      showToast("Patient consent is required before updating health status.", "warning");
      return;
    }
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

  const handleRequestAccess = () => {
    if (!patientId) {
      showToast("Missing patient details.", "warning");
      return;
    }
    requestAccessMutation.mutate({
      patient_id: patientId,
      note: accessRequestNote.trim() || undefined,
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
          {!hasRecordAccess && (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.warning,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <ShieldCheck color={theme.warning} size={16} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_700Bold",
                    color: theme.text,
                    marginLeft: 8,
                  }}
                >
                  Record Access Needed
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 10,
                }}
              >
                Patient must approve your request before you can view or update medical records.
              </Text>
              <Input
                label="Request note (optional)"
                value={accessRequestNote}
                onChangeText={setAccessRequestNote}
                placeholder="e.g. Follow-up review for current treatment plan."
              />
              <Button
                title={isAccessPending ? "Request Pending" : "Request Record Access"}
                onPress={handleRequestAccess}
                loading={requestAccessMutation.isLoading || accessStatusQuery.isLoading}
                disabled={isAccessPending}
              />
            </View>
          )}
          {hasRecordAccess && (
            <View
              style={{
                backgroundColor: `${theme.success}18`,
                borderWidth: 1,
                borderColor: theme.success,
                borderRadius: 12,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.success, fontFamily: "Inter_600SemiBold" }}>
                Access approved by patient. You have full record access.
              </Text>
            </View>
          )}
          {hasRecordAccess && (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Clinical forms are now managed in Health Hub under Update Condition, Prescription / Medication, and Full Clinical Record.
              </Text>
            </View>
          )}
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
                marginBottom: 6,
              }}
            >
              Patient Health Hub
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
              Review and update the patient Health Hub insights.
            </Text>
            <Button
              title={hasRecordAccess ? "Open Health Hub" : "Access Required"}
              disabled={!hasRecordAccess}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/patient-health-hub",
                  params: { patientId },
                })
              }
            />
          </View>
          {hasRecordAccess && (
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
                  marginBottom: 8,
                }}
              >
                Patient Record Timeline
              </Text>
              {patientRecordsQuery.isLoading ? (
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Loading records...
                </Text>
              ) : patientTimelineRecords.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  No medical records found for this patient yet.
                </Text>
              ) : (
                patientTimelineRecords.slice(0, 8).map((record) => (
                  <View
                    key={record.id}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      backgroundColor: theme.surface,
                      padding: 10,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                      {String(record.type || "note").replace("_", " ").toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleString()
                        : "Unknown date"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                      {record.notes || record.condition || "No details"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
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
              disabled={!hasRecordAccess}
            />
          </View>

          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 10,
            }}
          >
            Additional Charges (Optional)
          </Text>
          <Input
            label="Amount (KES)"
            value={additionalCharge}
            onChangeText={setAdditionalCharge}
            placeholder="e.g. 1500"
            keyboardType="numeric"
          />
          <Input
            label="Note (optional)"
            value={additionalChargeNote}
            onChangeText={setAdditionalChargeNote}
            placeholder="Explain the additional charges"
            multiline
            numberOfLines={3}
          />
          <Button
            title="Request Payment"
            onPress={handleRequestAdditionalCharge}
            loading={paymentRequestMutation.isLoading}
            disabled={!hasRecordAccess}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
