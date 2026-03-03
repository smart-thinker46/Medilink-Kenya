import React, { useState } from "react";
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
import { ArrowLeft, Crown, Sparkles, Search, FileText, MessageCircle, Mic } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";

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
    mutationFn: () => apiClient.aiHealthSummary({ patientId: auth?.user?.id }),
    onSuccess: (data) => setSummary(data || null),
    onError: (error) => showToast(error.message || "AI summary unavailable.", "error"),
  });

  const aiAssistantMutation = useMutation({
    mutationFn: () => apiClient.aiAssistant({ query: assistantQuery }),
    onSuccess: (data) => setAssistantAnswer(String(data?.answer || "")),
    onError: (error) => showToast(error.message || "AI assistant unavailable.", "error"),
  });

  const aiState = aiSettingsQuery.data || {};
  const isPremium = Boolean(aiState.isPremium);
  const aiEnabled = Boolean(aiState.aiEnabled);
  const canUse = Boolean(aiState.canUse);
  const provider = String(aiState.provider || "gemini").toUpperCase();
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
              AI Assistant
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Provider: {provider}
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
              Open Voice AI
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
              Search Medics, Hospitals, Pharmacies
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
                Run AI Search
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
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
                {summary.summary}
              </Text>
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
              Ask AI
            </Text>
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
                Ask AI
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
