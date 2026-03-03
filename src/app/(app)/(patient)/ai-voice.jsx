import React, { useMemo, useState } from "react";
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

  const settingsQuery = useQuery({
    queryKey: ["ai-settings", "voice"],
    queryFn: () => apiClient.aiGetSettings(),
  });

  const historyQuery = useQuery({
    queryKey: ["ai-voice-history"],
    queryFn: () => apiClient.aiVoiceHistory({ limit: 8 }),
  });

  const createSessionMutation = useMutation({
    mutationFn: () => apiClient.aiVoiceCreateSession({ mode, platform: "mobile", locale: "en-KE" }),
    onSuccess: (data) => {
      setSessionInfo(data || null);
      showToast(
        data?.vapi?.configured
          ? "Voice session started. Vapi configured."
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

  const aiState = settingsQuery.data || {};
  const canUse = Boolean(aiState?.canUse);
  const blockedReason = String(aiState?.blockedReason || "");
  const history = Array.isArray(historyQuery.data) ? historyQuery.data : [];

  const tools = useMemo(() => {
    if (mode === "search") return ["search_medics", "search_hospitals", "search_pharmacy_products"];
    if (mode === "records") return ["summarize_health_record", "search_pharmacy_products"];
    if (mode === "support") return ["request_support_chat"];
    if (mode === "emergency") return ["get_emergency_contacts", "search_medics", "search_hospitals"];
    return [
      "search_medics",
      "search_hospitals",
      "search_pharmacy_products",
      "summarize_health_record",
      "get_emergency_contacts",
      "request_support_chat",
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
              Voice AI
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Powered by Vapi + MediLink tools
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
                Vapi configured: {sessionInfo?.vapi?.configured ? "Yes" : "No"}
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
