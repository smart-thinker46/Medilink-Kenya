import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Mic, PhoneCall, ShieldAlert, Sparkles } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const MODES = [
  { id: "general", title: "General" },
  { id: "search", title: "Search" },
  { id: "records", title: "Records" },
  { id: "support", title: "Support" },
  { id: "emergency", title: "Emergency" },
];
const BASE64_ENCODING = FileSystem?.EncodingType?.Base64 || "base64";

export default function PatientAiVoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const [mode, setMode] = useState("general");
  const [query, setQuery] = useState("");
  const [toolName, setToolName] = useState("search_medics");
  const [toolResult, setToolResult] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [voiceText, setVoiceText] = useState("");
  const [transcript, setTranscript] = useState("");
  const soundRef = useRef(null);
  const tempAudioPathRef = useRef("");

  const settingsQuery = useQuery({
    queryKey: ["ai-settings", "voice"],
    queryFn: () => apiClient.aiGetSettings(),
  });

  const historyQuery = useQuery({
    queryKey: ["ai-voice-history"],
    queryFn: () => apiClient.aiVoiceHistory({ limit: 8 }),
  });

  const localVoiceStatusQuery = useQuery({
    queryKey: ["ai-voice-local-status"],
    queryFn: () => apiClient.aiVoiceLocalStatus(),
  });

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
      }
      const tempPath = String(tempAudioPathRef.current || "");
      if (tempPath) {
        FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
      }
    };
  }, []);

  const cleanupPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    const tempPath = String(tempAudioPathRef.current || "");
    if (tempPath) {
      tempAudioPathRef.current = "";
      await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
    }
  };

  const createSessionMutation = useMutation({
    mutationFn: () => apiClient.aiVoiceCreateSession({ mode, platform: "mobile", locale: "en-KE" }),
    onSuccess: (data) => {
      setSessionInfo(data || null);
      showToast(
        data?.vapi?.configured
          ? "Voice session started. Live voice integration is configured."
          : "Voice session started (guided mode).",
        "success",
      );
      historyQuery.refetch();
    },
    onError: (error) => {
      showToast(error?.message || "Failed to start voice session.", "error");
    },
  });

  const runToolMutation = useMutation({
    mutationFn: () => {
      const args =
        toolName === "search_medics"
          ? { specialization: query, location: query, name: query }
          : toolName === "search_hospitals"
            ? { name: query, location: query, services: query ? [query] : [] }
            : toolName === "search_pharmacy_products"
              ? { productName: query, location: query }
              : toolName === "summarize_health_record"
                ? {}
                : toolName === "get_emergency_contacts"
                  ? {}
                  : { note: query };
      return apiClient.aiVoiceTool({ toolName, args });
    },
    onSuccess: (data) => {
      setToolResult(data || null);
      showToast("Voice tool completed.", "success");
      historyQuery.refetch();
    },
    onError: (error) => {
      showToast(error?.message || "Tool execution failed.", "error");
    },
  });

  const ttsMutation = useMutation({
    mutationFn: (text) => apiClient.aiVoiceTts({ text }),
    onSuccess: async (data) => {
      await cleanupPlayback();
      const base64Audio = String(data?.audioBase64 || "").trim();
      const relativeUrl = String(data?.url || "").trim();
      const absoluteUrl = apiClient.resolveAssetUrl(relativeUrl);
      let playbackUri = "";
      if (base64Audio) {
        const tempFile = `${FileSystem.cacheDirectory || ""}medilink-ai-voice-${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
          encoding: BASE64_ENCODING,
        });
        tempAudioPathRef.current = tempFile;
        playbackUri = tempFile;
      } else if (absoluteUrl) {
        playbackUri = absoluteUrl;
      }
      if (!playbackUri) {
        showToast("TTS succeeded but no playable audio was returned.", "error");
        return;
      }
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: playbackUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        );
        soundRef.current = sound;
        showToast("Voice generated and playing in app.", "success");
      } catch {
        showToast("Voice generated but could not auto-play on this device.", "warning");
      }
    },
    onError: (error) => {
      showToast(error?.message || "Text-to-speech failed.", "error");
    },
  });

  const sttMutation = useMutation({
    mutationFn: async () => {
      const file = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });
      if (file.canceled || !file.assets?.length) {
        throw new Error("Audio selection cancelled.");
      }
      const picked = file.assets[0];
      return apiClient.aiVoiceStt({
        uri: picked.uri,
        name: picked.name || "voice.wav",
        type: picked.mimeType || "audio/wav",
      });
    },
    onSuccess: (data) => {
      const text = String(data?.text || "").trim();
      setTranscript(text);
      if (text) {
        setVoiceText(text);
        showToast("Speech transcribed successfully.", "success");
      } else {
        showToast("STT finished but returned empty text.", "warning");
      }
    },
    onError: (error) => {
      const message = String(error?.message || "");
      if (/cancelled/i.test(message)) return;
      showToast(message || "Speech-to-text failed.", "error");
    },
  });

  const aiState = settingsQuery.data || {};
  const canUse = Boolean(aiState?.canUse);
  const blockedReason = String(aiState?.blockedReason || "");
  const history = Array.isArray(historyQuery.data) ? historyQuery.data : [];
  const localVoiceStatus = localVoiceStatusQuery.data || {};

  const tools = useMemo(() => {
    if (mode === "search") return ["search_medics", "search_hospitals", "search_pharmacy_products", "guide_app_usage"];
    if (mode === "records") return ["summarize_health_record", "search_pharmacy_products", "guide_app_usage"];
    if (mode === "support") return ["request_support_chat", "guide_app_usage"];
    if (mode === "emergency") return ["get_emergency_contacts", "search_medics", "search_hospitals", "guide_app_usage"];
    return [
      "search_medics",
      "search_hospitals",
      "search_pharmacy_products",
      "summarize_health_record",
      "get_emergency_contacts",
      "request_support_chat",
      "guide_app_usage",
    ];
  }, [mode]);

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(patient)"))}
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
              Medilink Voice Assistant
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Voice tools for search, records, emergency, and app guidance
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Sparkles color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Access Status
            </Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 12, color: canUse ? theme.success : theme.warning }}>
            {canUse ? "Voice AI is enabled." : blockedReason || "Voice AI is unavailable."}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Mic color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Local Voice Engines (Piper + whisper.cpp)
            </Text>
          </View>
          {localVoiceStatusQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <>
              <Text style={{ fontSize: 12, color: localVoiceStatus?.ready ? theme.success : theme.warning }}>
                {localVoiceStatus?.ready
                  ? "Local voice engines are ready."
                  : "Local voice engines are not fully configured."}
              </Text>
              <Text style={{ marginTop: 5, fontSize: 11, color: theme.textSecondary }}>
                TTS: {localVoiceStatus?.tts?.binaryAvailable ? "binary ok" : "binary missing"} • model:{" "}
                {localVoiceStatus?.tts?.model || "not set"}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: theme.textSecondary }}>
                STT: {localVoiceStatus?.stt?.binaryAvailable ? "binary ok" : "binary missing"} • model:{" "}
                {localVoiceStatus?.stt?.model || "not set"}
              </Text>
            </>
          )}

          <TextInput
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="Text to convert to voice"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />

          <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
            <TouchableOpacity
              disabled={!canUse || !voiceText.trim() || ttsMutation.isLoading}
              onPress={() => ttsMutation.mutate(voiceText.trim())}
              style={{
                flex: 1,
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
                opacity: !canUse || !voiceText.trim() ? 0.6 : 1,
              }}
            >
              {ttsMutation.isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  Generate Voice
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!canUse || sttMutation.isLoading}
              onPress={() => sttMutation.mutate()}
              style={{
                flex: 1,
                backgroundColor: theme.success,
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
                opacity: !canUse ? 0.6 : 1,
              }}
            >
              {sttMutation.isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  Transcribe Audio File
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {!!transcript && (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                backgroundColor: theme.surface,
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                Last transcript
              </Text>
              <Text style={{ fontSize: 12, color: theme.text }}>{transcript}</Text>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>Session mode</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {MODES.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setMode(item.id)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: mode === item.id ? theme.primary : theme.border,
                  backgroundColor: mode === item.id ? `${theme.primary}20` : theme.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: mode === item.id ? theme.primary : theme.textSecondary,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            disabled={!canUse || createSessionMutation.isLoading}
            onPress={() => createSessionMutation.mutate()}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 11,
              alignItems: "center",
              opacity: !canUse ? 0.6 : 1,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {createSessionMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Mic color="#FFFFFF" size={16} />
                <Text style={{ marginLeft: 7, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                  Start Voice Session
                </Text>
              </>
            )}
          </TouchableOpacity>

          {sessionInfo ? (
            <View
              style={{
                marginTop: 10,
                backgroundColor: theme.surface,
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Session: {sessionInfo.sessionId}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: theme.textSecondary }}>
                Live voice integration: {sessionInfo?.vapi?.configured ? "Configured" : "Not configured"}
              </Text>
              {!!sessionInfo?.warning && (
                <Text style={{ marginTop: 4, fontSize: 12, color: theme.warning }}>
                  {sessionInfo.warning}
                </Text>
              )}
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <PhoneCall color={theme.info} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Guided Voice Tools
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tools.map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => setToolName(name)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: toolName === name ? theme.primary : theme.border,
                  backgroundColor: toolName === name ? `${theme.primary}20` : theme.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: toolName === name ? theme.primary : theme.textSecondary,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Optional query (name, specialization, location, product...)"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginTop: 10,
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
            disabled={!canUse || runToolMutation.isLoading}
            onPress={() => runToolMutation.mutate()}
            style={{
              marginTop: 10,
              backgroundColor: theme.success,
              borderRadius: 12,
              paddingVertical: 11,
              alignItems: "center",
              opacity: !canUse ? 0.6 : 1,
            }}
          >
            {runToolMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                Run Tool
              </Text>
            )}
          </TouchableOpacity>

          {toolResult ? (
            <View
              style={{
                marginTop: 10,
                backgroundColor: theme.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {JSON.stringify(toolResult, null, 2)}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <ShieldAlert color={theme.warning} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              Recent Voice Sessions
            </Text>
          </View>
          {historyQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : history.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>No voice sessions yet.</Text>
          ) : (
            history.map((item) => (
              <View
                key={item.id}
                style={{
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {String(item.mode || "general").toUpperCase()} • {item.status}
                </Text>
                <Text style={{ marginTop: 3, color: theme.textSecondary, fontSize: 11 }}>
                  Started: {item.startedAt || item.createdAt}
                </Text>
                <Text style={{ marginTop: 2, color: theme.textSecondary, fontSize: 11 }}>
                  Tools used: {Array.isArray(item.toolAudits) ? item.toolAudits.length : 0}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
