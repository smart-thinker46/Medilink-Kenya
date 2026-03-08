import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, Search, Sparkles, Pill, Store, Stethoscope } from "lucide-react-native";
import { useAudioRecorder, RecordingPresets } from "expo-audio";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const SCOPES = [
  {
    id: "medicine",
    label: "Medicines",
    icon: Pill,
    hint: "e.g. find amoxicillin near westlands",
  },
  {
    id: "pharmacy",
    label: "Pharmacies",
    icon: Store,
    hint: "e.g. pharmacies in nairobi open now",
  },
  {
    id: "medic",
    label: "Medics",
    icon: Stethoscope,
    hint: "e.g. cardiologist in mombasa",
  },
];

const emptyIfNotArray = (value) => (Array.isArray(value) ? value : []);

const getTimeGreeting = (date = new Date()) => {
  const hour = Number(date.getHours() || 0);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Hello";
};

const resolveDisplayName = (user) => {
  const fullName =
    String(user?.fullName || user?.name || user?.firstName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || "";
  if (fullName) return fullName;
  const email = String(user?.email || "").trim();
  if (!email.includes("@")) return "";
  return email.split("@")[0];
};

export default function AiFinderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const [scope, setScope] = useState("medicine");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [resultNotes, setResultNotes] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const webMediaRecorderRef = React.useRef(null);
  const webMediaStreamRef = React.useRef(null);
  const webAudioChunksRef = React.useRef([]);

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "ai-finder", auth?.user?.role],
    queryFn: () => apiClient.aiGetSettings(),
  });
  const canUseAi = Boolean(aiSettingsQuery.data?.canUse);
  const isPremium = Boolean(aiSettingsQuery.data?.isPremium);
  const blockedReason = String(aiSettingsQuery.data?.blockedReason || "");
  const role = String(auth?.user?.role || "").toUpperCase();
  const displayName = useMemo(() => resolveDisplayName(auth?.user), [auth?.user]);
  const hasRedirectedToPaymentRef = useRef(false);
  const hasPlayedGreetingRef = useRef(false);

  const { speak: speakGreeting, stop: stopGreeting } = useAiSpeechPlayer({
    preferDeviceSpeech: true,
  });

  useEffect(() => {
    return () => {
      stopGreeting().catch(() => undefined);
    };
  }, [stopGreeting]);

  useEffect(() => {
    if (!aiSettingsQuery.isSuccess) return;
    if (canUseAi) return;
    if (isPremium) return;
    if (hasRedirectedToPaymentRef.current) return;
    hasRedirectedToPaymentRef.current = true;
    showToast("AI is a premium feature. Complete payment to continue.", "info");
    router.replace({
      pathname: "/(app)/(shared)/subscription-checkout",
      params: { role },
    });
  }, [aiSettingsQuery.isSuccess, canUseAi, isPremium, role, router, showToast]);

  useEffect(() => {
    if (!aiSettingsQuery.isSuccess || !canUseAi) return;
    if (hasPlayedGreetingRef.current) return;
    hasPlayedGreetingRef.current = true;
    const greeting = getTimeGreeting();
    const introText = [
      `${greeting}${displayName ? `, ${displayName}` : ""}.`,
      "Hi. I am Medilink AI.",
      "I help you find medicines, pharmacies, and medics quickly using text or voice.",
      "Please describe what you want me to find.",
    ].join(" ");
    speakGreeting(introText);
  }, [aiSettingsQuery.isSuccess, canUseAi, displayName, speakGreeting]);

  React.useEffect(() => {
    return () => {
      if (isVoiceRecording) {
        audioRecorder.stop().catch(() => undefined);
      }
      try {
        if (webMediaRecorderRef.current?.state === "recording") {
          webMediaRecorderRef.current.stop();
        }
      } catch {
        // ignore cleanup errors
      }
      const stream = webMediaStreamRef.current;
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioRecorder, isVoiceRecording]);

  const voiceToTextMutation = useMutation({
    mutationFn: (input) => {
      if (Platform.OS === "web") {
        if (typeof Blob !== "undefined" && input instanceof Blob) {
          return apiClient.aiVoiceStt({
            file: input,
            name: "ai-finder-query.webm",
            type: input.type || "audio/webm",
            language: "en",
          });
        }
        throw new Error("Voice recording not captured.");
      }
      const uri = String(input || "").trim();
      if (!uri) throw new Error("Voice recording not captured.");
      return apiClient.aiVoiceStt({
        uri,
        name: "ai-finder-query.m4a",
        type: "audio/m4a",
        language: "en",
      });
    },
    onSuccess: (data) => {
      const text = String(data?.text || "").trim();
      if (!text) {
        showToast("No speech transcript returned.", "warning");
        return;
      }
      setQuery(text);
      finderMutation.mutate({ text, scope });
    },
    onError: (error) => {
      showToast(error?.message || "Voice transcription failed.", "error");
    },
  });

  const finderMutation = useMutation({
    mutationFn: async ({ text, scope: nextScope }) => {
      const normalizedQuery = String(text || "").trim();
      if (!normalizedQuery) {
        return { results: [], notes: "Type or speak your query first." };
      }

      if (nextScope === "medicine") {
        const response = await apiClient.aiVoiceTool({
          toolName: "search_pharmacy_products",
          args: {
            productName: normalizedQuery,
            location: normalizedQuery,
          },
        });
        const products = emptyIfNotArray(response?.result || response?.results || response);
        return {
          results: products.map((item) => ({
            id: item?.id || item?.productId || `${item?.name || "product"}-${Math.random()}`,
            type: "medicine",
            name: item?.name || item?.productName || "Medicine",
            subtitle: [
              item?.price ? `KES ${Number(item.price).toLocaleString()}` : "",
              item?.stock !== undefined ? `Stock: ${item.stock}` : "",
              item?.pharmacy?.name || item?.pharmacyName || "",
              item?.pharmacy?.location || item?.location || "",
            ]
              .filter(Boolean)
              .join(" | "),
          })),
          notes: String(response?.notes || "Medicine search complete."),
        };
      }

      const include = nextScope === "medic" ? ["medic"] : ["pharmacy"];
      const response = await apiClient.aiSearch({
        query: normalizedQuery,
        include,
        limit: 12,
      });
      const searchResults = emptyIfNotArray(response?.results);
      return {
        results: searchResults,
        notes: String(response?.notes || ""),
      };
    },
    onSuccess: (data) => {
      const rows = emptyIfNotArray(data?.results);
      setResults(rows);
      setResultNotes(String(data?.notes || ""));
      if (!rows.length) {
        showToast("No matches found. Try a clearer query.", "warning");
      } else {
        showToast(`Found ${rows.length} match(es).`, "success");
      }
    },
    onError: (error) => {
      showToast(error?.message || "AI finder failed.", "error");
    },
  });

  const selectedScope = useMemo(
    () => SCOPES.find((item) => item.id === scope) || SCOPES[0],
    [scope],
  );

  const runFinder = () => {
    if (!canUseAi) {
      showToast(blockedReason || "AI is currently unavailable for this account.", "warning");
      return;
    }
    finderMutation.mutate({ text: query, scope });
  };

  const stopWebRecorder = async () => {
    const recorder = webMediaRecorderRef.current;
    if (!recorder) throw new Error("Recorder not ready.");
    const stream = webMediaStreamRef.current;
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const audioBlob = new Blob(webAudioChunksRef.current || [], {
            type: recorder.mimeType || "audio/webm",
          });
          webAudioChunksRef.current = [];
          webMediaRecorderRef.current = null;
          if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
          webMediaStreamRef.current = null;
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };
      recorder.onerror = () => reject(new Error("Web recorder failed."));
      try {
        recorder.stop();
      } catch (error) {
        reject(error);
      }
    });
  };

  const startWebRecorder = async () => {
    const mediaDevices = globalThis?.navigator?.mediaDevices;
    const MediaRecorderApi = globalThis?.MediaRecorder;
    if (!mediaDevices?.getUserMedia || !MediaRecorderApi) {
      throw new Error("Browser voice recording is not supported.");
    }
    const stream = await mediaDevices.getUserMedia({ audio: true });
    webMediaStreamRef.current = stream;
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    const selectedMime = mimeCandidates.find((mime) => {
      try {
        return typeof MediaRecorderApi.isTypeSupported === "function"
          ? MediaRecorderApi.isTypeSupported(mime)
          : false;
      } catch {
        return false;
      }
    });
    const recorder = selectedMime
      ? new MediaRecorderApi(stream, { mimeType: selectedMime })
      : new MediaRecorderApi(stream);
    webAudioChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event?.data && event.data.size > 0) {
        webAudioChunksRef.current.push(event.data);
      }
    };
    recorder.start();
    webMediaRecorderRef.current = recorder;
  };

  const toggleVoiceQuery = async () => {
    if (!canUseAi) {
      showToast(blockedReason || "AI is currently unavailable for this account.", "warning");
      return;
    }
    if (voiceToTextMutation.isPending || finderMutation.isPending) return;

    if (Platform.OS === "web") {
      if (isVoiceRecording) {
        try {
          const audioBlob = await stopWebRecorder();
          setIsVoiceRecording(false);
          voiceToTextMutation.mutate(audioBlob);
        } catch (error) {
          setIsVoiceRecording(false);
          showToast(error?.message || "Failed to stop web recording.", "error");
        }
        return;
      }
      try {
        await startWebRecorder();
        setIsVoiceRecording(true);
        showToast("Listening... click mic again to stop.", "info");
      } catch (error) {
        setIsVoiceRecording(false);
        showToast(error?.message || "Unable to start web recording.", "error");
      }
      return;
    }

    if (isVoiceRecording) {
      try {
        const recorded = await audioRecorder.stop();
        setIsVoiceRecording(false);
        const uri = String(recorded?.uri || "").trim();
        if (!uri) {
          showToast("No recording captured. Try again.", "warning");
          return;
        }
        voiceToTextMutation.mutate(uri);
      } catch (error) {
        setIsVoiceRecording(false);
        showToast(error?.message || "Failed to stop recording.", "error");
      }
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsVoiceRecording(true);
      showToast("Listening... tap mic again to stop.", "info");
    } catch (error) {
      setIsVoiceRecording(false);
      showToast(error?.message || "Unable to start voice recording.", "error");
    }
  };

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (role === "PATIENT") {
      router.replace("/(app)/(patient)");
      return;
    }
    if (role === "MEDIC") {
      router.replace("/(app)/(medic)");
      return;
    }
    if (role === "HOSPITAL_ADMIN") {
      router.replace("/(app)/(hospital)");
      return;
    }
    if (role === "PHARMACY_ADMIN") {
      router.replace("/(app)/(pharmacy)");
      return;
    }
    router.replace("/(app)/(admin)");
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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={safeBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.surface,
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Medilink AI Finder
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Find medicines, pharmacies, and medics using text or voice.
            </Text>
          </View>
        </View>

        {!!blockedReason && !canUseAi && (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{blockedReason}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {SCOPES.map((item) => {
            const Icon = item.icon;
            const active = scope === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setScope(item.id);
                  setResults([]);
                  setResultNotes("");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}1A` : theme.card,
                }}
              >
                <Icon color={active ? theme.primary : theme.iconColor} size={14} />
                <Text
                  style={{
                    marginLeft: 6,
                    color: active ? theme.primary : theme.textSecondary,
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Search color={theme.iconColor} size={18} />
            <TextInput
              placeholder={selectedScope?.hint || "Describe what you are looking for"}
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={{
                marginLeft: 10,
                flex: 1,
                color: theme.text,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
              }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              onPress={runFinder}
              disabled={!canUseAi || !query.trim() || finderMutation.isPending || voiceToTextMutation.isPending}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity:
                  !canUseAi || !query.trim() || finderMutation.isPending || voiceToTextMutation.isPending
                    ? 0.7
                    : 1,
              }}
            >
              <Sparkles color="#fff" size={14} />
              <Text
                style={{
                  marginLeft: 6,
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {finderMutation.isPending ? "Finding..." : "Find with AI"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleVoiceQuery}
              disabled={!canUseAi || finderMutation.isPending || voiceToTextMutation.isPending}
              style={{
                width: 46,
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isVoiceRecording ? theme.error : theme.border,
                backgroundColor: isVoiceRecording ? `${theme.error}22` : theme.card,
                alignItems: "center",
                justifyContent: "center",
                opacity: !canUseAi || finderMutation.isPending || voiceToTextMutation.isPending ? 0.7 : 1,
              }}
            >
              <Mic color={isVoiceRecording ? theme.error : theme.iconColor} size={16} />
            </TouchableOpacity>
          </View>
          {(isVoiceRecording || voiceToTextMutation.isPending) && (
            <Text style={{ marginTop: 8, color: theme.textSecondary, fontSize: 11 }}>
              {isVoiceRecording ? "Recording voice query..." : "Transcribing voice query..."}
            </Text>
          )}
        </View>

        {!!resultNotes && (
          <Text style={{ marginBottom: 8, color: theme.textSecondary, fontSize: 12 }}>{resultNotes}</Text>
        )}

        <View style={{ gap: 8 }}>
          {finderMutation.isPending && (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                padding: 12,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={theme.primary} />
              <Text style={{ marginTop: 6, color: theme.textSecondary, fontSize: 12 }}>
                Processing AI search...
              </Text>
            </View>
          )}

          {!finderMutation.isPending &&
            results.map((item, index) => (
              <View
                key={item?.id || `${item?.name || "result"}-${index}`}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  padding: 12,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  {String(item?.name || "Result")}
                </Text>
                {!!String(item?.subtitle || "").trim() && (
                  <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 12 }}>
                    {String(item?.subtitle || "").trim()}
                  </Text>
                )}
                {!!String(item?.reason || "").trim() && (
                  <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 11 }}>
                    Why: {String(item?.reason || "").trim()}
                  </Text>
                )}
              </View>
            ))}

          {!finderMutation.isPending && !results.length && (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                No results yet. Enter a query and run AI Finder.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
