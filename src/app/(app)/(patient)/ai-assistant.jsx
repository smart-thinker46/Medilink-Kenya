import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Search,
  FileText,
  MessageCircle,
  Mic,
  Volume2,
  CalendarClock,
  ShieldAlert,
} from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const formatListBlock = (title, items = []) => {
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!list.length) return "";
  return [title, ...list.map((item, index) => `${index + 1}. ${String(item)}`), ""].join("\n");
};

const formatAppHelpAnswer = (data) => {
  if (!data) return "";
  const title = String(data?.title || "Medilink Guide");
  const summary = String(data?.summary || "");
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const tips = Array.isArray(data?.tips) ? data.tips : [];
  return [
    title,
    summary,
    "",
    formatListBlock("Steps", steps),
    formatListBlock("Tips", tips),
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
};

export default function PatientAiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [appointmentQuery, setAppointmentQuery] = useState("");
  const [appointmentResult, setAppointmentResult] = useState(null);
  const [medicationsInput, setMedicationsInput] = useState("");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [medicationSafetyResult, setMedicationSafetyResult] = useState(null);
  const { speak: speakAiText, stop: stopAiSpeech, isSpeaking: aiSpeaking } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  useEffect(() => {
    return () => {
      stopAiSpeech().catch(() => undefined);
    };
  }, [stopAiSpeech]);

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "patient-ai-assistant"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });

  const aiUpdateMutation = useMutation({
    mutationFn: (enabled) => apiClient.aiUpdateSettings({ enabled }),
    onSuccess: () => aiSettingsQuery.refetch(),
    onError: (error) => showToast(error.message || "Unable to update AI settings.", "error"),
  });

  const aiSearchMutation = useMutation({
    mutationFn: () =>
      apiClient.aiSearch({
        query: searchQuery,
        include: ["medic", "hospital", "pharmacy"],
        limit: 10,
      }),
    onSuccess: (data) => setSearchResults(Array.isArray(data?.results) ? data.results : []),
    onError: (error) => showToast(error.message || "AI search unavailable.", "error"),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: () => apiClient.aiMedicalRecordSummary({ patientId: auth?.user?.id }),
    onSuccess: (data) => setSummary(data || null),
    onError: (error) => showToast(error.message || "AI summary unavailable.", "error"),
  });

  const aiAppointmentMutation = useMutation({
    mutationFn: () =>
      apiClient.aiAppointmentCopilot({
        query: appointmentQuery,
        preferredDate: new Date().toISOString().slice(0, 10),
        include: ["medic", "hospital"],
        limit: 8,
      }),
    onSuccess: (data) => setAppointmentResult(data || null),
    onError: (error) => showToast(error.message || "Appointment copilot unavailable.", "error"),
  });

  const aiMedicationMutation = useMutation({
    mutationFn: () =>
      apiClient.aiMedicationSafety({
        patientId: auth?.user?.id,
        medications: medicationsInput,
        allergies: allergiesInput,
      }),
    onSuccess: (data) => setMedicationSafetyResult(data || null),
    onError: (error) => showToast(error.message || "Medication safety unavailable.", "error"),
  });

  const aiAssistantMutation = useMutation({
    mutationFn: () => apiClient.aiAssistant({ query: assistantQuery }),
    onSuccess: (data) => setAssistantAnswer(String(data?.answer || "")),
    onError: (error) => showToast(error.message || "AI assistant unavailable.", "error"),
  });

  const aiHelpMutation = useMutation({
    mutationFn: ({ topic, query }) => apiClient.aiKnowledgeHelp({ topic, query }),
    onSuccess: (data) => {
      const response = String(data?.answer || "").trim() || formatAppHelpAnswer(data);
      setAssistantAnswer(response);
      if (response) {
        showToast("App guide generated.", "success");
      }
    },
    onError: (error) => showToast(error.message || "Unable to generate app help.", "error"),
  });

  const aiState = aiSettingsQuery.data || {};
  const isPremium = Boolean(aiState.isPremium);
  const aiEnabled = Boolean(aiState.aiEnabled);
  const canUse = Boolean(aiState.canUse);
  const providerLabel = String(aiState.displayProvider || "Medilink AI");
  const blockedReason = aiState.blockedReason || "";
  const busy = aiSettingsQuery.isLoading || aiUpdateMutation.isLoading;

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(patient)");
  };

  const promptEnable = () => {
    if (!isPremium) {
      Alert.alert(
        "Premium Required",
        "AI is a premium feature. Please activate subscription first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Subscribe",
            onPress: () =>
              router.push({
                pathname: "/(app)/(shared)/subscription-checkout",
                params: { role: "PATIENT" },
              }),
          },
        ],
      );
      return;
    }
    aiUpdateMutation.mutate(true);
  };

  const getHealthSummarySpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      String(data?.summary || "").trim(),
      Array.isArray(data?.highlights) && data.highlights.length
        ? `Highlights: ${data.highlights.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.nextSteps) && data.nextSteps.length
        ? `Next steps: ${data.nextSteps.slice(0, 4).join(". ")}`
        : "",
      String(data?.disclaimer || "").trim(),
    ]
      .filter(Boolean)
      .join(". ");
  };

  const getAppointmentSpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    const first = Array.isArray(data?.recommendations) ? data.recommendations[0] : null;
    return [
      String(data?.summary || "").trim(),
      first?.name ? `Top match is ${String(first.name)}.` : "",
      Array.isArray(first?.availableSlots) && first.availableSlots.length
        ? `Available slots include ${first.availableSlots.slice(0, 3).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  const getMedicationSafetySpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      `Risk level is ${String(data?.riskLevel || "unknown")}.`,
      String(data?.summary || "").trim(),
      Array.isArray(data?.warnings) && data.warnings.length
        ? `Warnings: ${data.warnings.slice(0, 3).join(". ")}`
        : "",
      Array.isArray(data?.recommendations) && data.recommendations.length
        ? `Recommendations: ${data.recommendations.slice(0, 3).join(". ")}`
        : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity
            onPress={safeBack}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Medilink AI Assistant
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Powered by {providerLabel}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Crown color={isPremium ? theme.warning : theme.textSecondary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              {isPremium ? "Premium Active" : "Premium Required"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {blockedReason || (aiEnabled ? "AI is enabled for your account." : "Enable AI to start using assistant tools.")}
          </Text>
          {!aiEnabled ? (
            <TouchableOpacity
              onPress={promptEnable}
              disabled={busy}
              style={{
                marginTop: 12,
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  Enable AI
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => aiUpdateMutation.mutate(false)}
              disabled={busy}
              style={{
                marginTop: 12,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Disable AI
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push("/(app)/(patient)/ai-voice")}
            style={{
              marginTop: 10,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.surface,
            }}
            >
              <Mic color={theme.primary} size={15} />
            <Text
              style={{
                marginLeft: 8,
                color: theme.text,
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Open Voice Assistant
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Search color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Medilink AI Search
            </Text>
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="e.g Cardiologist 5 years Nairobi under 3000"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => aiSearchMutation.mutate()}
            disabled={!canUse || !searchQuery.trim() || aiSearchMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !searchQuery.trim() ? 0.6 : 1,
            }}
          >
            {aiSearchMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Run Smart Search
                </Text>
              )}
          </TouchableOpacity>

          {searchResults.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {searchResults.map((item) => (
                <View
                  key={`${item.type}-${item.id}`}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {item.name}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
                    {(item.type || "").toUpperCase()} {item.subtitle ? `• ${item.subtitle}` : ""}
                  </Text>
                  {item.reason ? (
                    <Text style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
                      {item.reason}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <CalendarClock color={theme.info} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Appointment Copilot
            </Text>
          </View>
          <TextInput
            value={appointmentQuery}
            onChangeText={setAppointmentQuery}
            placeholder="Describe who you need: e.g. female cardiologist in Nairobi"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => aiAppointmentMutation.mutate()}
            disabled={!canUse || !appointmentQuery.trim() || aiAppointmentMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.info,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !appointmentQuery.trim() ? 0.6 : 1,
            }}
          >
            {aiAppointmentMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Find Providers and Slots
              </Text>
            )}
          </TouchableOpacity>

          {!!appointmentResult?.summary && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => speakAiText(getAppointmentSpeechText(appointmentResult))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.surface,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Copilot"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
                {appointmentResult.summary}
              </Text>
              {(Array.isArray(appointmentResult?.recommendations)
                ? appointmentResult.recommendations
                : []
              )
                .slice(0, 3)
                .map((item, index) => (
                  <Text
                    key={`${String(item?.id || "provider")}-${index}`}
                    style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}
                  >
                    {index + 1}. {String(item?.name || "Provider")}
                    {Array.isArray(item?.availableSlots) && item.availableSlots.length
                      ? ` • slots: ${item.availableSlots.join(", ")}`
                      : ""}
                  </Text>
                ))}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <ShieldAlert color={theme.warning} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Medication Safety Check
            </Text>
          </View>
          <TextInput
            value={medicationsInput}
            onChangeText={setMedicationsInput}
            placeholder="Medications (comma separated)"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TextInput
            value={allergiesInput}
            onChangeText={setAllergiesInput}
            placeholder="Allergies (optional, comma separated)"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => aiMedicationMutation.mutate()}
            disabled={!canUse || !medicationsInput.trim() || aiMedicationMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.warning,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !medicationsInput.trim() ? 0.6 : 1,
            }}
          >
            {aiMedicationMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Check Safety
              </Text>
            )}
          </TouchableOpacity>

          {!!medicationSafetyResult?.summary && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => speakAiText(getMedicationSafetySpeechText(medicationSafetyResult))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.surface,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Safety Report"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
                Risk: {String(medicationSafetyResult?.riskLevel || "UNKNOWN")} •{" "}
                {medicationSafetyResult.summary}
              </Text>
              {Array.isArray(medicationSafetyResult?.warnings) &&
              medicationSafetyResult.warnings.length > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.warning, lineHeight: 18 }}>
                  Warnings: {medicationSafetyResult.warnings.join(" • ")}
                </Text>
              ) : null}
              {Array.isArray(medicationSafetyResult?.recommendations) &&
              medicationSafetyResult.recommendations.length > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Recommendations: {medicationSafetyResult.recommendations.join(" • ")}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <FileText color={theme.success} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Summarize My Health Records
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => aiSummaryMutation.mutate()}
            disabled={!canUse || aiSummaryMutation.isLoading}
            style={{
              backgroundColor: theme.success,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse ? 0.6 : 1,
            }}
          >
            {aiSummaryMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Generate Summary
              </Text>
            )}
          </TouchableOpacity>

          {!!summary?.summary && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => speakAiText(getHealthSummarySpeechText(summary))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.surface,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Summary"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
                {summary.summary}
              </Text>
              {Array.isArray(summary?.highlights) && summary.highlights.length > 0 ? (
                <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Highlights: {summary.highlights.join(" • ")}
                </Text>
              ) : null}
              {Array.isArray(summary?.nextSteps) && summary.nextSteps.length > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Next steps: {summary.nextSteps.join(" • ")}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MessageCircle color={theme.accent} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Ask Medilink AI
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {[
              { title: "How to book appointment", topic: "appointments" },
              { title: "How to find medic", topic: "find_medic" },
              { title: "Emergency guidance", topic: "emergency" },
              { title: "Use voice assistant", topic: "voice" },
            ].map((item) => (
              <TouchableOpacity
                key={item.topic}
                onPress={() => aiHelpMutation.mutate({ topic: item.topic, query: item.title })}
                disabled={!canUse || aiHelpMutation.isLoading}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: !canUse ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={assistantQuery}
            onChangeText={setAssistantQuery}
            placeholder="Ask about medics, hospitals, pharmacies, or app workflow..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
              textAlignVertical: "top",
            }}
          />
          <TouchableOpacity
            onPress={() => aiAssistantMutation.mutate()}
            disabled={!canUse || !assistantQuery.trim() || aiAssistantMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.accent,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !assistantQuery.trim() ? 0.6 : 1,
            }}
          >
            {aiAssistantMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Ask Medilink AI
              </Text>
            )}
          </TouchableOpacity>

          {!!assistantAnswer && (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Sparkles color={theme.primary} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 12, color: theme.textSecondary }}>
                  AI response
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => speakAiText(assistantAnswer)}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.surface,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Response"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
                {assistantAnswer}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
