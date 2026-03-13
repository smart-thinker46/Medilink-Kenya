import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Sparkles, Volume2, SlidersHorizontal, Play } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useMutation, useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

export default function AdminAiSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { speak: speakPreview, isSpeaking } = useAiSpeechPlayer({
    preferDeviceSpeech: false,
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "admin-ai-settings"],
    queryFn: () => apiClient.aiGetSettings(),
  });

  const voiceConfigQuery = useQuery({
    queryKey: ["admin-ai-voice-config"],
    queryFn: () => apiClient.adminGetAiVoiceConfig(),
  });

  const [selectedModel, setSelectedModel] = useState("");
  const [speed, setSpeed] = useState(1);

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.adminUpdateAiVoiceConfig(payload),
    onSuccess: () => {
      voiceConfigQuery.refetch();
      showToast("AI voice settings saved.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to save AI voice settings.", "error");
    },
  });

  const aiState = aiSettingsQuery.data || {};
  const voiceConfig = voiceConfigQuery.data || {};
  const options = Array.isArray(voiceConfig.options) ? voiceConfig.options : [];
  const selectedOption =
    options.find((option) => String(option?.model || "") === String(selectedModel)) || options[0];

  useEffect(() => {
    if (voiceConfig?.selectedModel) {
      setSelectedModel(String(voiceConfig.selectedModel));
    }
    if (typeof voiceConfig?.speed === "number") {
      setSpeed(voiceConfig.speed);
    }
  }, [voiceConfig?.selectedModel, voiceConfig?.speed]);

  const speedRange = useMemo(() => {
    const fallback = { min: 0.6, max: 1.4, step: 0.1 };
    if (!voiceConfig?.speedRange) return fallback;
    return {
      min: Number(voiceConfig.speedRange.min ?? fallback.min),
      max: Number(voiceConfig.speedRange.max ?? fallback.max),
      step: Number(voiceConfig.speedRange.step ?? fallback.step),
    };
  }, [voiceConfig?.speedRange]);

  const clampSpeed = (value) =>
    Math.min(Math.max(value, speedRange.min), speedRange.max);

  const handleSpeedChange = (delta) => {
    const next = clampSpeed(Number(speed) + delta);
    setSpeed(Number(next.toFixed(2)));
  };

  const handleSave = () => {
    const payload = {};
    if (selectedModel) payload.model = selectedModel;
    payload.speed = clampSpeed(Number(speed || 1));
    saveMutation.mutate(payload);
  };

  const isSaving = saveMutation.isLoading;
  const isAiEnabled = Boolean(aiState.aiEnabled);

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Medilink AI Settings
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Control voice and delivery speed for AI responses.
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles color={theme.primary} size={18} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              AI Status
            </Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
            {isAiEnabled ? "AI is enabled." : aiState?.blockedReason || "AI is disabled."}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Volume2 color={theme.primary} size={18} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Default Voice
            </Text>
          </View>
          <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
            Select the default TTS model used by Medilink AI.
          </Text>
          <View
            style={{
              marginTop: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
              backgroundColor: theme.surface,
            }}
          >
            <Picker
              selectedValue={selectedModel}
              onValueChange={(value) => setSelectedModel(String(value || ""))}
              style={{ color: theme.text }}
            >
              {options.length === 0 && (
                <Picker.Item label="No voice models configured" value="" />
              )}
              {options.map((option) => (
                <Picker.Item
                  key={option.id}
                  label={`${option.label}${option.language ? ` • ${String(option.language).toUpperCase()}` : ""}${option.exists ? "" : " (missing)"}`}
                  value={option.model}
                  enabled={Boolean(option.exists)}
                />
              ))}
            </Picker>
          </View>
          {selectedOption ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Selected voice: {selectedOption.label}
                {selectedOption.language
                  ? ` (${String(selectedOption.language).toUpperCase()})`
                  : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() =>
                    speakPreview("Hello, I am Medilink AI.", {
                      model: selectedOption.model,
                      forceServer: true,
                      language: "en",
                    })
                  }
                  disabled={isSpeaking || !selectedOption.exists}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    opacity: isSpeaking || !selectedOption.exists ? 0.6 : 1,
                  }}
                >
                  <Play color={theme.text} size={14} />
                  <Text style={{ fontSize: 12, color: theme.text }}>Preview English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    speakPreview(
                      "Habari, mimi ni Medilink AI. Ninakusaidia kupata dawa, famasia na madaktari kwa haraka.",
                      {
                        model: selectedOption.model,
                        forceServer: true,
                        language: "sw",
                      },
                    )
                  }
                  disabled={isSpeaking || !selectedOption.exists}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    opacity: isSpeaking || !selectedOption.exists ? 0.6 : 1,
                  }}
                >
                  <Play color={theme.text} size={14} />
                  <Text style={{ fontSize: 12, color: theme.text }}>Preview Swahili</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Available Voices
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
            These are the configured Piper voices on the backend.
          </Text>
          <View style={{ marginTop: 10 }}>
            {options.length === 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                No voice models configured.
              </Text>
            ) : (
              options.map((option) => (
                <View
                  key={`voice-${option.id}`}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    {option.label}
                    {option.language ? ` • ${String(option.language).toUpperCase()}` : ""}
                    {option.isDefault ? " (Default)" : ""}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {option.exists ? "Ready" : "Missing model file"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal color={theme.primary} size={18} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Voice Speed
            </Text>
          </View>
          <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
            Adjust how fast the AI voice speaks.
          </Text>
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => handleSpeedChange(-speedRange.step)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, color: theme.text }}>-</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: theme.text }}>
                {Number(speed || 1).toFixed(2)}x
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                Range {speedRange.min} - {speedRange.max}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSpeedChange(speedRange.step)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, color: theme.text }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
            {isSaving ? "Saving..." : "Save AI Settings"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
