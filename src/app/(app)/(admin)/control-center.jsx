import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Shield,
  UserCheck,
  AlertTriangle,
  LifeBuoy,
  Server,
  FileText,
  Bell,
  Flag,
  Scale,
  CircleDollarSign,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const Card = ({ title, icon: Icon, theme, children, right }) => (
  <View
    style={{
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 12,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {Icon ? <Icon size={16} color={theme.primary} /> : null}
        <Text
          style={{
            marginLeft: Icon ? 8 : 0,
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
          }}
        >
          {title}
        </Text>
      </View>
      {right}
    </View>
    <View style={{ marginTop: 10 }}>{children}</View>
  </View>
);

const Pill = ({ text, color, theme }) => (
  <View
    style={{
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: `${color}22`,
      marginRight: 8,
      marginBottom: 8,
    }}
  >
    <Text style={{ color, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{text}</Text>
  </View>
);

export default function AdminControlCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { speak: speakAiText, isSpeaking: aiSpeaking } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  const [policyTitle, setPolicyTitle] = useState("");
  const [policyBody, setPolicyBody] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const controlQuery = useQuery({
    queryKey: ["admin-control-center"],
    queryFn: () => apiClient.adminGetControlCenter(),
  });

  const reloadAll = () => controlQuery.refetch();

  const reviewKycMutation = useMutation({
    mutationFn: ({ userId, status }) => apiClient.adminReviewKyc(userId, { status }),
    onSuccess: () => {
      showToast("KYC updated.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "KYC update failed.", "error"),
  });

  const updateFlagsMutation = useMutation({
    mutationFn: (flags) => apiClient.adminUpdateFeatureFlags(flags),
    onSuccess: () => {
      showToast("Feature flags updated.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Flag update failed.", "error"),
  });

  const aiVoiceConfigQuery = useQuery({
    queryKey: ["admin-ai-voice-config", "control-center"],
    queryFn: () => apiClient.adminGetAiVoiceConfig(),
  });
  const [selectedAiVoiceModel, setSelectedAiVoiceModel] = useState("");

  const updateAiVoiceMutation = useMutation({
    mutationFn: (model) => apiClient.adminUpdateAiVoiceConfig(model),
    onSuccess: () => {
      showToast("AI voice updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-voice-config"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ai-voice-config", "control-center"] });
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to update AI voice.", "error"),
  });

  useEffect(() => {
    const selected = String(aiVoiceConfigQuery.data?.selectedModel || "").trim();
    if (selected) {
      setSelectedAiVoiceModel(selected);
      return;
    }
    const firstModel = String(aiVoiceConfigQuery.data?.options?.[0]?.model || "").trim();
    if (firstModel) {
      setSelectedAiVoiceModel(firstModel);
    }
  }, [aiVoiceConfigQuery.data]);

  const createPolicyMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateContentPolicy({
        type: "POLICY",
        title: policyTitle,
        body: policyBody,
      }),
    onSuccess: () => {
      showToast("Policy drafted.", "success");
      setPolicyTitle("");
      setPolicyBody("");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Policy creation failed.", "error"),
  });

  const updateRoleMatrixMutation = useMutation({
    mutationFn: (matrix) => apiClient.adminUpdateRolePermissions(matrix),
    onSuccess: () => {
      showToast("Role matrix updated.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Role matrix update failed.", "error"),
  });

  const publishPolicyMutation = useMutation({
    mutationFn: (policyId) => apiClient.adminPublishContentPolicy(policyId, { broadcast: true }),
    onSuccess: () => {
      showToast("Policy published and broadcasted.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Publish failed.", "error"),
  });

  const createSupportTicketMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateSupportTicket({
        subject: supportSubject || "General Support",
        description: supportDescription || "Follow up required",
        priority: "HIGH",
      }),
    onSuccess: () => {
      showToast("Support ticket created.", "success");
      setSupportSubject("");
      setSupportDescription("");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to create ticket.", "error"),
  });

  const createEmergencyMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateEmergencyIncident({
        title: "Critical emergency dispatch",
        severity: "HIGH",
        notes: "Created from admin control center",
      }),
    onSuccess: () => {
      showToast("Emergency incident created.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to create emergency incident.", "error"),
  });

  const createComplianceMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateComplianceRequest({
        type: "DATA_EXPORT",
        reason: "Periodic compliance export",
      }),
    onSuccess: () => {
      showToast("Compliance request created.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to create compliance request.", "error"),
  });

  const exportComplianceMutation = useMutation({
    mutationFn: () => apiClient.adminExportComplianceSnapshot({ scope: "overview" }),
    onSuccess: () => {
      showToast("Compliance snapshot generated.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Compliance export failed.", "error"),
  });

  const createDisputeMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateDispute({
        reason: disputeReason || "Payment mismatch",
        amount: 0,
      }),
    onSuccess: () => {
      showToast("Dispute created.", "success");
      setDisputeReason("");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to create dispute.", "error"),
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: (id) => apiClient.adminUpdateDispute(id, { status: "REFUND_APPROVED" }),
    onSuccess: () => {
      showToast("Dispute marked refund-approved.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to update dispute.", "error"),
  });

  const createFraudCaseMutation = useMutation({
    mutationFn: (payload) => apiClient.adminCreateFraudCase(payload),
    onSuccess: () => {
      showToast("Fraud case created.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to create fraud case.", "error"),
  });

  const resolveFraudCaseMutation = useMutation({
    mutationFn: (id) => apiClient.adminUpdateFraudCase(id, { status: "RESOLVED" }),
    onSuccess: () => {
      showToast("Fraud case resolved.", "success");
      reloadAll();
    },
    onError: (error) => showToast(error.message || "Failed to resolve fraud case.", "error"),
  });

  const data = controlQuery.data || {};
  const auditTrail = data.auditTrail || {};
  const rolePermissions = data.rolePermissions || {};
  const kyc = data.kyc || {};
  const revenue = data.revenue || {};
  const fraud = data.fraud || {};
  const support = data.support || {};
  const platformHealth = data.platformHealth || {};
  const contentPolicies = data.contentPolicies || {};
  const emergencyOps = data.emergencyOps || {};
  const compliance = data.complianceRequests || {};
  const featureFlags = data.featureFlags?.flags || {};
  const aiVoiceConfig = aiVoiceConfigQuery.data || {};
  const aiVoiceOptions = Array.isArray(aiVoiceConfig?.options) ? aiVoiceConfig.options : [];
  const aiVoiceAppliedModel = String(aiVoiceConfig?.selectedModel || "");
  const booleanFeatureFlags = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(featureFlags || {}).filter(([, value]) => typeof value === "boolean"),
      ),
    [featureFlags],
  );
  const disputes = data.disputes || {};

  const matrixRows = useMemo(() => Object.entries(rolePermissions?.matrix || {}), [rolePermissions]);
  const kycQueue = kyc.queue || [];
  const openFraudCases = (fraud.cases || []).filter((item) => String(item?.status || "").toUpperCase() === "OPEN");
  const openSupportTickets = (support.supportTickets || []).filter((item) => String(item?.status || "").toUpperCase() === "OPEN");
  const draftPolicies = (contentPolicies.items || []).filter((item) => String(item?.status || "").toUpperCase() === "DRAFT");
  const openEmergencies = (emergencyOps.incidents || []).filter((item) => String(item?.status || "").toUpperCase() === "OPEN");
  const openDisputes = (disputes.disputes || []).filter((item) => String(item?.status || "").toUpperCase() === "OPEN");

  if (controlQuery.isLoading) {
    return (
      <ScreenLayout>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>Loading control center...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 22, color: theme.text, fontFamily: "Nunito_700Bold" }}>
            Admin Control Center
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(admin)/analytics")}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: theme.surface,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Analytics</Text>
          </TouchableOpacity>
        </View>

        <Card title="Audit Trail" icon={Shield} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Total Events: {auditTrail.totalEvents || 0}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {(auditTrail.topActions || []).slice(0, 6).map((item) => (
              <Pill
                key={`${item.action}-${item.count}`}
                text={`${item.action}: ${item.count}`}
                color={theme.primary}
                theme={theme}
              />
            ))}
          </View>
          <TouchableOpacity
            style={{ marginTop: 6 }}
            onPress={() => router.push("/(app)/(admin)/audit-logs")}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              Open full audit log
            </Text>
          </TouchableOpacity>
        </Card>

        <Card
          title="Role & Permission Matrix"
          icon={UserCheck}
          theme={theme}
          right={
            <TouchableOpacity
              onPress={() => updateRoleMatrixMutation.mutate(rolePermissions?.matrix || {})}
            >
              <Text style={{ color: theme.primary, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                Save
              </Text>
            </TouchableOpacity>
          }
        >
          {matrixRows.map(([role, permissions]) => (
            <View key={role} style={{ marginBottom: 8 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{role}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }} numberOfLines={2}>
                {(permissions || []).join(", ")}
              </Text>
            </View>
          ))}
        </Card>

        <Card title="KYC / License Verification Queue" icon={UserCheck} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
            Pending: {kyc?.totals?.pending || 0} • Missing Docs: {kyc?.totals?.missingDocuments || 0}
          </Text>
          {kycQueue.slice(0, 5).map((item) => (
            <View key={item.userId} style={{ marginBottom: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                {item.fullName || item.email || item.userId}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                {item.role} • {item.kycStatus}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <TouchableOpacity
                  style={{ marginRight: 10 }}
                  onPress={() => reviewKycMutation.mutate({ userId: item.userId, status: "APPROVED" })}
                >
                  <Text style={{ color: theme.success, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reviewKycMutation.mutate({ userId: item.userId, status: "REJECTED" })}>
                  <Text style={{ color: theme.error, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        <Card title="Revenue Intelligence" icon={CircleDollarSign} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>MRR: {revenue.currency || "KES"} {Number(revenue.mrr || 0).toLocaleString()}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Churn: {revenue.churnRate || 0}%</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Failed payments: {revenue.failedPayments || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>ARPU: {revenue.currency || "KES"} {Number(revenue.arpu || 0).toLocaleString()}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Outstanding: {revenue.currency || "KES"} {Number(revenue.outstandingBalances || 0).toLocaleString()}</Text>
        </Card>

        <Card title="Fraud & Abuse Center" icon={AlertTriangle} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>
            Open Cases: {fraud?.totals?.openCases || 0} • Suggested Alerts: {fraud?.totals?.suggestedAlerts || 0}
          </Text>
          {(fraud.suggestedAlerts || []).slice(0, 3).map((alert, index) => (
            <TouchableOpacity
              key={`${alert.userId}-${index}`}
              onPress={() =>
                createFraudCaseMutation.mutate({
                  userId: alert.userId,
                  type: alert.type,
                  severity: alert.severity,
                  details: alert,
                })
              }
              style={{ marginBottom: 8 }}
            >
              <Text style={{ color: theme.warning, fontSize: 11 }}>
                Create case: {alert.type} ({alert.severity}) for {alert.userId}
              </Text>
            </TouchableOpacity>
          ))}
          {openFraudCases.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => resolveFraudCaseMutation.mutate(item.id)}
              style={{ marginBottom: 6 }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                Resolve {item.type} ({item.severity})
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card title="Support Command Center" icon={LifeBuoy} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Open Tickets: {support?.totals?.openTickets || 0} • SLA breaches: {support?.totals?.slaBreaches || 0}
          </Text>
          <TextInput
            value={supportSubject}
            onChangeText={setSupportSubject}
            placeholder="Ticket subject"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: 12,
            }}
          />
          <TextInput
            value={supportDescription}
            onChangeText={setSupportDescription}
            placeholder="Ticket description"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: 12,
            }}
          />
          <TouchableOpacity
            onPress={() => createSupportTicketMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Create support ticket</Text>
          </TouchableOpacity>
          {openSupportTickets.slice(0, 3).map((ticket) => (
            <Text key={ticket.id} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {ticket.subject} ({ticket.priority})
            </Text>
          ))}
        </Card>

        <Card title="Platform Health Monitor" icon={Server} theme={theme}>
          {Object.entries(platformHealth || {}).map(([service, details]) => {
            if (service === "id" || service === "createdAt") return null;
            return (
              <Text key={service} style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {service}: {details?.status || "UP"}
                {typeof details?.successRate === "number" ? ` (${details.successRate}%)` : ""}
              </Text>
            );
          })}
        </Card>

        <Card title="Content & Policy Control" icon={FileText} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Published: {contentPolicies?.metrics?.published || 0} • Acceptance Rate: {contentPolicies?.metrics?.acceptanceRate || 0}%
          </Text>
          <TextInput
            value={policyTitle}
            onChangeText={setPolicyTitle}
            placeholder="Policy title"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: 12,
            }}
          />
          <TextInput
            value={policyBody}
            onChangeText={setPolicyBody}
            placeholder="Policy content"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: 12,
            }}
          />
          <TouchableOpacity
            onPress={() => createPolicyMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Create draft policy</Text>
          </TouchableOpacity>
          {draftPolicies.slice(0, 3).map((policy) => (
            <TouchableOpacity
              key={policy.id}
              onPress={() => publishPolicyMutation.mutate(policy.id)}
              style={{ marginTop: 6 }}
            >
              <Text style={{ color: theme.warning, fontSize: 11 }}>Publish draft: {policy.title}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card title="Emergency Operations Panel" icon={Bell} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Active incidents: {emergencyOps?.totals?.active || 0}
          </Text>
          <TouchableOpacity
            onPress={() => createEmergencyMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Create emergency incident</Text>
          </TouchableOpacity>
          {openEmergencies.slice(0, 3).map((incident) => (
            <Text key={incident.id} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {incident.title} ({incident.severity})
            </Text>
          ))}
        </Card>

        <Card title="Compliance & Data Export" icon={FileText} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Open Requests: {compliance?.totals?.open || 0}
          </Text>
          <TouchableOpacity
            onPress={() => createComplianceMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Create data export request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => exportComplianceMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.warning, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Generate compliance snapshot</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Feature Flags Console" icon={Flag} theme={theme}>
          {Object.entries(booleanFeatureFlags || {}).map(([key, enabled]) => (
            <TouchableOpacity
              key={key}
              onPress={() => updateFlagsMutation.mutate({ ...featureFlags, [key]: !enabled })}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 12 }}>{key}</Text>
              <Text
                style={{
                  color: enabled ? theme.success : theme.error,
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {enabled ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card title="AI Voice Model" icon={Bell} theme={theme}>
          {aiVoiceOptions.length === 0 ? (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              No model voices found. Set backend `PIPER_MODEL` and `PIPER_MODEL_VARIANTS`, then restart backend.
            </Text>
          ) : (
            <>
              {aiVoiceOptions.map((option) => {
                const model = String(option?.model || "");
                const selected = model === selectedAiVoiceModel;
                const unavailable = option?.exists === false;
                return (
                  <TouchableOpacity
                    key={option?.id || model}
                    disabled={!model || unavailable}
                    onPress={() => setSelectedAiVoiceModel(model)}
                    style={{
                      borderWidth: 1,
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? `${theme.primary}22` : theme.surface,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      marginBottom: 8,
                      opacity: unavailable ? 0.55 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.primary : theme.text,
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {String(option?.label || "Voice")}
                      {option?.isDefault ? " (Default)" : ""}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                      {unavailable
                        ? "Model file not found on server."
                        : model === aiVoiceAppliedModel
                          ? "Applied"
                          : selected
                            ? "Selected"
                            : "Tap to select"}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                disabled={!selectedAiVoiceModel || aiSpeaking}
                onPress={() =>
                  speakAiText("Hello, I am Medilink AI voice preview.", {
                    forceServer: true,
                    model: selectedAiVoiceModel,
                  })
                }
                style={{
                  borderRadius: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 8,
                  opacity: !selectedAiVoiceModel || aiSpeaking ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  Preview Selected Voice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  !selectedAiVoiceModel ||
                  selectedAiVoiceModel === aiVoiceAppliedModel ||
                  updateAiVoiceMutation.isPending
                }
                onPress={() => updateAiVoiceMutation.mutate(selectedAiVoiceModel)}
                style={{
                  borderRadius: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                  backgroundColor: theme.primary,
                  opacity:
                    !selectedAiVoiceModel ||
                    selectedAiVoiceModel === aiVoiceAppliedModel ||
                    updateAiVoiceMutation.isPending
                      ? 0.6
                      : 1,
                }}
              >
                <Text style={{ fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                  Apply Selected Voice
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        <Card title="Dispute & Refund Management" icon={Scale} theme={theme}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Open disputes: {disputes?.totals?.openDisputes || 0} • Pending refunds: {disputes?.totals?.pendingRefunds || 0}
          </Text>
          <TextInput
            value={disputeReason}
            onChangeText={setDisputeReason}
            placeholder="Dispute reason"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: 12,
            }}
          />
          <TouchableOpacity
            onPress={() => createDisputeMutation.mutate()}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Create dispute</Text>
          </TouchableOpacity>
          {openDisputes.slice(0, 4).map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              onPress={() => resolveDisputeMutation.mutate(dispute.id)}
              style={{ marginTop: 6 }}
            >
              <Text style={{ color: theme.warning, fontSize: 11 }}>
                Mark refund-approved: {dispute.reason || dispute.id}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </ScreenLayout>
  );
}
