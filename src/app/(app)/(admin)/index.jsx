import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { MotiView } from "moti";
import {
  Crown,
  Users,
  Hospital,
  Stethoscope,
  Store,
  CreditCard,
  Settings,
  Sparkles,
  Bell,
  Mail,
  Video,
  Home,
  MessageCircle,
  ShieldAlert,
  Briefcase,
  Volume2,
  Mic,
} from "lucide-react-native";
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from "expo-audio";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { useAuthStore } from "@/utils/auth/store";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import OnlineStatusChip from "@/components/OnlineStatusChip";
import { useToast } from "@/components/ToastProvider";
import { getFirstName, getTimeGreeting } from "@/utils/greeting";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";
import UserAvatar from "@/components/UserAvatar";

export default function AdminOverviewScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const { t, formatDateTime } = useI18n();
  const { auth } = useAuthStore();
  const avatarUser = auth?.user || {};
  const firstName = getFirstName(auth?.user, "Admin");
  const timeGreeting = getTimeGreeting();
  const queryClient = useQueryClient();
  const { isUserOnline } = useOnlineUsers();
  const { showToast } = useToast();
  const isOnline = isUserOnline(auth?.user);
  const isWide = screenWidth >= 1024;
  const { speak: speakAiText, isSpeaking: aiSpeaking } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiClient.getAdminOverview(),
  });

  const [hireFilters, setHireFilters] = useState({
    status: "ALL",
    search: "",
    start: "",
    end: "",
  });
  const [paymentFilters, setPaymentFilters] = useState({
    status: "ALL",
    type: "ALL",
    search: "",
    start: "",
    end: "",
    payerRole: "ALL",
    recipientRole: "ALL",
  });

  const hireParams = useMemo(
    () => ({
      hireStatus: hireFilters.status,
      hireSearch: hireFilters.search,
      hireStart: hireFilters.start,
      hireEnd: hireFilters.end,
    }),
    [hireFilters],
  );

  const operationsQuery = useQuery({
    queryKey: ["admin-operations", hireParams],
    queryFn: () => apiClient.adminGetOperations(hireParams),
  });

  const paymentParams = useMemo(
    () => ({
      status: paymentFilters.status === "ALL" ? undefined : paymentFilters.status,
      type: paymentFilters.type === "ALL" ? undefined : paymentFilters.type,
      search: paymentFilters.search || undefined,
      start: paymentFilters.start || undefined,
      end: paymentFilters.end || undefined,
      payerRole: paymentFilters.payerRole === "ALL" ? undefined : paymentFilters.payerRole,
      recipientRole:
        paymentFilters.recipientRole === "ALL" ? undefined : paymentFilters.recipientRole,
    }),
    [paymentFilters],
  );

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments-history", paymentParams],
    queryFn: () => apiClient.getPaymentHistory(paymentParams),
  });

  const overview = overviewQuery.data || {};
  const totals = overview.totals || {};
  const revenue = overview.revenue || {};
  const top = overview.top || {};
  const operations = operationsQuery.data || {};
  const hiresDetailed = Array.isArray(operations?.hiresDetailed)
    ? operations.hiresDetailed
    : [];
  const payments = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : [];
  const latestHires = [...hiresDetailed].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  );
  const recentPayments = [...payments].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  );

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "admin-overview"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });

  const aiUpdateMutation = useMutation({
    mutationFn: (enabled) => apiClient.aiUpdateSettings({ enabled }),
    onSuccess: () => {
      aiSettingsQuery.refetch();
      showToast("AI settings updated.", "success");
    },
    onError: (error) => {
      showToast(error.message || "Failed to update AI settings.", "error");
    },
  });

  const aiState = aiSettingsQuery.data || {};
  const aiEnabled = Boolean(aiState.aiEnabled);
  const aiCanUse = Boolean(aiState.canUse);
  const aiProviderLabel = String(aiState.displayProvider || "Medilink AI");
  const aiBusy = aiSettingsQuery.isLoading || aiUpdateMutation.isLoading;
  const aiBlockedReason = aiState.blockedReason || "";
  const aiVoiceConfigQuery = useQuery({
    queryKey: ["admin-ai-voice-config"],
    queryFn: () => apiClient.adminGetAiVoiceConfig(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });
  const [selectedAiVoiceModel, setSelectedAiVoiceModel] = useState("");
  const aiVoiceUpdateMutation = useMutation({
    mutationFn: (model) => apiClient.adminUpdateAiVoiceConfig(model),
    onSuccess: (data) => {
      const nextModel = String(data?.selectedModel || "").trim();
      if (nextModel) {
        setSelectedAiVoiceModel(nextModel);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-ai-voice-config"] });
      showToast("AI voice updated.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to update AI voice.", "error");
    },
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

  const [aiUserQuery, setAiUserQuery] = useState("");
  const [aiUserResponse, setAiUserResponse] = useState(null);
  const [aiEmailInput, setAiEmailInput] = useState("");
  const [aiEmailReadResponse, setAiEmailReadResponse] = useState(null);
  const [aiEmailBrief, setAiEmailBrief] = useState("");
  const [aiEmailTone, setAiEmailTone] = useState("professional");
  const [aiEmailAudience, setAiEmailAudience] = useState("ALL");
  const [aiEmailDraftResponse, setAiEmailDraftResponse] = useState(null);
  const [helpDeskQuery, setHelpDeskQuery] = useState("");
  const [helpDeskResponse, setHelpDeskResponse] = useState(null);
  const [isHelpDeskVoiceRecording, setIsHelpDeskVoiceRecording] = useState(false);
  const helpDeskAudioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const helpDeskRecorderState = useAudioRecorderState(helpDeskAudioRecorder, 250);
  const helpDeskWebMediaRecorderRef = React.useRef(null);
  const helpDeskWebMediaStreamRef = React.useRef(null);
  const helpDeskWebAudioChunksRef = React.useRef([]);
  const helpDeskWebSilenceCleanupRef = React.useRef(null);
  const helpDeskSilenceLastSoundAtRef = useRef(0);
  const helpDeskSilenceStartedAtRef = useRef(0);
  const helpDeskAutoStopInFlightRef = useRef(false);
  const normalizeUserFilterParams = (params = {}) => {
    const source = params || {};
    const normalized = { ...source };
    if (typeof source.subscriptionActive === "boolean" && typeof source.active !== "boolean") {
      normalized.active = source.subscriptionActive;
    }
    if (typeof normalized.active === "boolean") {
      normalized.active = normalized.active ? "true" : "false";
    }
    if (typeof normalized.online === "boolean") {
      normalized.online = normalized.online ? "true" : "false";
    }
    if (normalized.role) {
      normalized.role = String(normalized.role).toUpperCase();
    }
    if (normalized.status) {
      normalized.status = String(normalized.status).toLowerCase();
    }
    delete normalized.subscriptionActive;
    return normalized;
  };

  const buildRouteWithParams = (target, params = {}) => {
    const base = String(target || "").trim();
    if (!base) return "";
    const entries = Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== null && String(value).trim() !== "",
    );
    if (!entries.length) return base;
    const query = entries
      .map(([key, value]) => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(value))}`)
      .join("&");
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}${query}`;
  };

  const runHelpDeskActions = async (actions = []) => {
    const list = Array.isArray(actions) ? actions : [];
    const reports = [];
    for (const action of list) {
      const type = String(action?.type || "").toUpperCase();
      try {
        if (type === "OPEN_SCREEN") {
          const target = String(action?.target || action?.route || "").trim();
          const rawParams = action?.params || {};
          const params =
            target.includes("/(app)/(admin)/users")
              ? {
                  ...normalizeUserFilterParams(rawParams),
                  ...(String(rawParams?.search || "").trim() ? {} : { search: action?.query || "" }),
                }
              : rawParams;
          const route = buildRouteWithParams(target, params);
          if (route) {
            router.push(route);
            reports.push(`Opened ${route}`);
          } else {
            reports.push("No route provided for OPEN_SCREEN action.");
          }
          continue;
        }

        if (type === "SEARCH_USERS" || type === "OPEN_USERS") {
          const params = {
            ...normalizeUserFilterParams(action?.filters || action?.params || {}),
            ...(String(action?.query || "").trim() ? { search: String(action.query).trim() } : {}),
          };
          const route = buildRouteWithParams("/(app)/(admin)/users", params);
          router.push(route);
          reports.push(`Opened ${route}`);
          continue;
        }

        if (type === "SEND_NOTIFICATION" && action?.execute) {
          await apiClient.adminSendNotification(action?.payload || {});
          reports.push("Notification sent.");
          continue;
        }

        if (type === "CREATE_SUPPORT_TICKET" && action?.execute) {
          const ticket = await apiClient.adminCreateSupportTicket(action?.payload || {});
          reports.push(`Support ticket created${ticket?.id ? `: ${ticket.id}` : "."}`);
          continue;
        }

        if (type === "CREATE_EMERGENCY_INCIDENT" && action?.execute) {
          const incident = await apiClient.adminCreateEmergencyIncident(action?.payload || {});
          reports.push(`Emergency incident created${incident?.id ? `: ${incident.id}` : "."}`);
          continue;
        }

        if (type === "EXPORT_COMPLIANCE" && action?.execute) {
          const scope = String(action?.scope || "overview");
          await apiClient.adminExportComplianceSnapshot({ scope });
          reports.push(`Compliance snapshot exported for scope: ${scope}.`);
          continue;
        }

        if (type === "UPDATE_FEATURE_FLAG" && action?.execute && action?.flag) {
          const current = await apiClient.adminGetFeatureFlags();
          const merged = {
            ...(current?.flags || {}),
            [String(action.flag)]: Boolean(action?.value),
          };
          await apiClient.adminUpdateFeatureFlags(merged);
          reports.push(
            `Feature flag ${String(action.flag)} set to ${Boolean(action?.value) ? "enabled" : "disabled"}.`,
          );
          continue;
        }

        if (type === "BLOCK_USER" && action?.execute && action?.userId) {
          await apiClient.blockAdminUser(action.userId, Boolean(action?.blocked));
          reports.push(action?.blocked ? "User suspended." : "User unsuspended.");
          continue;
        }

        if (type === "VERIFY_USER" && action?.execute && action?.userId) {
          await apiClient.verifyAdminUser(action.userId, Boolean(action?.verified));
          reports.push(action?.verified ? "User verified." : "User unverified.");
          continue;
        }

        if (type === "TOGGLE_AI" && action?.execute) {
          await apiClient.aiUpdateSettings({ enabled: Boolean(action?.enabled) });
          aiSettingsQuery.refetch();
          reports.push(Boolean(action?.enabled) ? "AI enabled." : "AI disabled.");
          continue;
        }

        reports.push(`Skipped unsupported action: ${type || "UNKNOWN"}.`);
      } catch (error) {
        reports.push(String(error?.message || `Failed action: ${type}`));
      }
    }
    return reports;
  };

  const aiUserAssistantMutation = useMutation({
    mutationFn: (query) => apiClient.aiAdminUsersAssistant({ query }),
    onSuccess: (data) => {
      setAiUserResponse(data || null);
      showToast("AI user search completed.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "AI user search failed.", "error");
    },
  });

  const aiEmailReadMutation = useMutation({
    mutationFn: (emailText) =>
      apiClient.aiAdminEmailsAssistant({
        mode: "summarize",
        emailText,
      }),
    onSuccess: (data) => {
      setAiEmailReadResponse(data || null);
      showToast("Email summary generated.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Email summary failed.", "error");
    },
  });

  const aiEmailDraftMutation = useMutation({
    mutationFn: ({ brief, tone, audience }) =>
      apiClient.aiAdminEmailsAssistant({
        mode: "compose",
        brief,
        tone,
        audience,
      }),
    onSuccess: (data) => {
      setAiEmailDraftResponse(data || null);
      showToast("Email draft generated.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Email draft generation failed.", "error");
    },
  });

  const aiHelpDeskMutation = useMutation({
    mutationFn: ({ query, execute }) =>
      apiClient.aiAdminOpsCopilot({
        query,
        execute: Boolean(execute),
        tone: aiEmailTone,
        audience: aiEmailAudience,
      }),
    onSuccess: async (data, variables) => {
      let executionReports = [];
      const actionList = Array.isArray(data?.actions) ? data.actions : [];
      const actionsToRun = variables?.execute
        ? actionList
        : actionList.filter((action) => {
            const type = String(action?.type || "").toUpperCase();
            return type === "OPEN_SCREEN" || type === "OPEN_USERS" || type === "SEARCH_USERS";
          });
      if (actionsToRun.length) {
        executionReports = await runHelpDeskActions(actionsToRun);
      }
      setHelpDeskResponse({
        ...(data || {}),
        executionReports,
      });
      if (String(data?.intent || "") === "draft_email" && data?.data) {
        setAiEmailDraftResponse(data.data);
      }
      if (variables?.execute && executionReports.length) {
        showToast(executionReports[0], "success");
      } else {
        showToast("AI help desk response ready.", "success");
      }
    },
    onError: (error) => {
      showToast(error?.message || "AI help desk failed.", "error");
    },
  });

  React.useEffect(() => {
    return () => {
      if (isHelpDeskVoiceRecording) {
        helpDeskAudioRecorder.stop().catch(() => undefined);
      }
      try {
        if (helpDeskWebMediaRecorderRef.current?.state === "recording") {
          helpDeskWebMediaRecorderRef.current.stop();
        }
      } catch {
        // ignore cleanup errors
      }
      const stream = helpDeskWebMediaStreamRef.current;
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (helpDeskWebSilenceCleanupRef.current) {
        helpDeskWebSilenceCleanupRef.current();
        helpDeskWebSilenceCleanupRef.current = null;
      }
    };
  }, [helpDeskAudioRecorder, isHelpDeskVoiceRecording]);

  React.useEffect(() => {
    if (!isHelpDeskVoiceRecording || Platform.OS === "web") {
      helpDeskSilenceLastSoundAtRef.current = 0;
      helpDeskSilenceStartedAtRef.current = 0;
      helpDeskAutoStopInFlightRef.current = false;
      return;
    }
    const metering = helpDeskRecorderState?.metering;
    if (typeof metering !== "number") return;
    const now = Date.now();
    if (!helpDeskSilenceStartedAtRef.current) {
      helpDeskSilenceStartedAtRef.current = now;
    }
    const threshold = metering >= 0 && metering <= 1 ? 0.02 : -45;
    const isSilent = metering <= threshold;
    if (!helpDeskSilenceLastSoundAtRef.current) {
      helpDeskSilenceLastSoundAtRef.current = now;
    }
    if (!isSilent) {
      helpDeskSilenceLastSoundAtRef.current = now;
      return;
    }
    const silentFor = now - helpDeskSilenceLastSoundAtRef.current;
    const recordedFor = now - helpDeskSilenceStartedAtRef.current;
    if (recordedFor > 1200 && silentFor > 1200 && !helpDeskAutoStopInFlightRef.current) {
      helpDeskAutoStopInFlightRef.current = true;
      stopHelpDeskNativeRecordingAndTranscribe();
    }
  }, [isHelpDeskVoiceRecording, helpDeskRecorderState?.metering]);

  const helpDeskVoiceToTextMutation = useMutation({
    mutationFn: (input) => {
      if (Platform.OS === "web") {
        if (typeof Blob !== "undefined" && input instanceof Blob) {
          return apiClient.aiVoiceStt({
            file: input,
            name: "admin-helpdesk.webm",
            type: input.type || "audio/webm",
            language: "en",
          });
        }
        throw new Error("Web voice recording is missing.");
      }
      const uri = String(input || "").trim();
      if (!uri) {
        throw new Error("Audio recording not found.");
      }
      return apiClient.aiVoiceStt({
        uri,
        name: "admin-helpdesk.m4a",
        type: "audio/m4a",
        language: "en",
      });
    },
    onSuccess: (data) => {
      const transcript = String(data?.text || "").trim();
      if (!transcript) {
        showToast("No speech transcript returned.", "warning");
        return;
      }
      setHelpDeskQuery(transcript);
      aiHelpDeskMutation.mutate({ query: transcript, execute: true });
    },
    onError: (error) => {
      showToast(error?.message || "Voice transcription failed.", "error");
    },
  });

  const startWebSilenceMonitor = (stream, onSilence) => {
    if (typeof window === "undefined") return () => {};
    const AudioContextApi = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextApi) return () => {};
    const audioContext = new AudioContextApi();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let lastSoundAt = Date.now();
    let startedAt = Date.now();
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (rms > 0.02) {
        lastSoundAt = now;
      }
      const silentFor = now - lastSoundAt;
      const recordedFor = now - startedAt;
      if (recordedFor > 1200 && silentFor > 1200) {
        onSilence?.();
      }
    }, 200);
    return () => {
      clearInterval(interval);
      try {
        source.disconnect();
      } catch {}
      try {
        audioContext.close();
      } catch {}
    };
  };

  const stopHelpDeskWebRecorder = async () => {
    const recorder = helpDeskWebMediaRecorderRef.current;
    if (!recorder) {
      throw new Error("Recorder not initialized.");
    }
    const stream = helpDeskWebMediaStreamRef.current;
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const audioBlob = new Blob(helpDeskWebAudioChunksRef.current || [], {
            type: recorder.mimeType || "audio/webm",
          });
          helpDeskWebAudioChunksRef.current = [];
          helpDeskWebMediaRecorderRef.current = null;
          if (stream?.getTracks) {
            stream.getTracks().forEach((track) => track.stop());
          }
          helpDeskWebMediaStreamRef.current = null;
          if (helpDeskWebSilenceCleanupRef.current) {
            helpDeskWebSilenceCleanupRef.current();
            helpDeskWebSilenceCleanupRef.current = null;
          }
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };
      recorder.onerror = () => {
        if (stream?.getTracks) {
          stream.getTracks().forEach((track) => track.stop());
        }
        helpDeskWebMediaStreamRef.current = null;
        helpDeskWebMediaRecorderRef.current = null;
        if (helpDeskWebSilenceCleanupRef.current) {
          helpDeskWebSilenceCleanupRef.current();
          helpDeskWebSilenceCleanupRef.current = null;
        }
        reject(new Error("Web recorder failed."));
      };
      try {
        recorder.stop();
      } catch (error) {
        if (stream?.getTracks) {
          stream.getTracks().forEach((track) => track.stop());
        }
        helpDeskWebMediaStreamRef.current = null;
        helpDeskWebMediaRecorderRef.current = null;
        if (helpDeskWebSilenceCleanupRef.current) {
          helpDeskWebSilenceCleanupRef.current();
          helpDeskWebSilenceCleanupRef.current = null;
        }
        reject(error);
      }
    });
  };

  const startHelpDeskWebRecorder = async () => {
    const mediaDevices = globalThis?.navigator?.mediaDevices;
    const MediaRecorderApi = globalThis?.MediaRecorder;
    if (!mediaDevices?.getUserMedia || !MediaRecorderApi) {
      throw new Error("Browser voice recording is not supported.");
    }
    const stream = await mediaDevices.getUserMedia({ audio: true });
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
    helpDeskWebMediaStreamRef.current = stream;
    try {
      const recorder = selectedMime
        ? new MediaRecorderApi(stream, { mimeType: selectedMime })
        : new MediaRecorderApi(stream);
      helpDeskWebAudioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event?.data && event.data.size > 0) {
          helpDeskWebAudioChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      helpDeskWebMediaRecorderRef.current = recorder;
      if (helpDeskWebSilenceCleanupRef.current) {
        helpDeskWebSilenceCleanupRef.current();
      }
      helpDeskWebSilenceCleanupRef.current = startWebSilenceMonitor(stream, async () => {
        if (helpDeskAutoStopInFlightRef.current) return;
        if (helpDeskWebMediaRecorderRef.current?.state !== "recording") return;
        helpDeskAutoStopInFlightRef.current = true;
        try {
          const audioBlob = await stopHelpDeskWebRecorder();
          setIsHelpDeskVoiceRecording(false);
          helpDeskVoiceToTextMutation.mutate(audioBlob);
        } catch (error) {
          setIsHelpDeskVoiceRecording(false);
          showToast(error?.message || "Failed to stop web voice recording.", "error");
        } finally {
          helpDeskAutoStopInFlightRef.current = false;
        }
      });
    } catch (error) {
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      helpDeskWebMediaStreamRef.current = null;
      helpDeskWebMediaRecorderRef.current = null;
      throw error;
    }
  };

  const stopHelpDeskNativeRecordingAndTranscribe = async () => {
    try {
      const recorded = await helpDeskAudioRecorder.stop();
      setIsHelpDeskVoiceRecording(false);
      const uri = String(recorded?.uri || "").trim();
      if (!uri) {
        showToast("No recording captured. Try again.", "warning");
        return;
      }
      helpDeskVoiceToTextMutation.mutate(uri);
    } catch (error) {
      setIsHelpDeskVoiceRecording(false);
      showToast(error?.message || "Failed to stop recording.", "error");
    } finally {
      helpDeskAutoStopInFlightRef.current = false;
    }
  };

  const toggleHelpDeskVoice = async () => {
    if (helpDeskVoiceToTextMutation.isPending || aiHelpDeskMutation.isLoading) return;

    if (Platform.OS === "web") {
      if (isHelpDeskVoiceRecording) {
        try {
          const audioBlob = await stopHelpDeskWebRecorder();
          setIsHelpDeskVoiceRecording(false);
          helpDeskVoiceToTextMutation.mutate(audioBlob);
        } catch (error) {
          setIsHelpDeskVoiceRecording(false);
          showToast(error?.message || "Failed to stop web voice recording.", "error");
        }
        return;
      }
      try {
        await startHelpDeskWebRecorder();
        setIsHelpDeskVoiceRecording(true);
        helpDeskAutoStopInFlightRef.current = false;
        showToast("Listening... click mic again to stop.", "info");
      } catch (error) {
        setIsHelpDeskVoiceRecording(false);
        showToast(error?.message || "Unable to start web voice recording.", "error");
      }
      return;
    }

    if (isHelpDeskVoiceRecording) {
      await stopHelpDeskNativeRecordingAndTranscribe();
      return;
    }

    try {
      await helpDeskAudioRecorder.prepareToRecordAsync();
      helpDeskAudioRecorder.record();
      setIsHelpDeskVoiceRecording(true);
      helpDeskSilenceLastSoundAtRef.current = Date.now();
      helpDeskSilenceStartedAtRef.current = Date.now();
      helpDeskAutoStopInFlightRef.current = false;
      showToast("Listening... tap mic again to stop.", "info");
    } catch (error) {
      setIsHelpDeskVoiceRecording(false);
      showToast(error?.message || "Unable to start voice recording.", "error");
    }
  };

  const aiSuggestedFilters = aiUserResponse?.suggestedFilters || {};
  const aiSuggestedQueryParams = useMemo(() => {
    const entries = [];
    if (aiSuggestedFilters?.role) {
      entries.push(`role=${encodeURIComponent(String(aiSuggestedFilters.role))}`);
    }
    if (aiSuggestedFilters?.status) {
      entries.push(`status=${encodeURIComponent(String(aiSuggestedFilters.status))}`);
    }
    if (aiSuggestedFilters?.search) {
      entries.push(`search=${encodeURIComponent(String(aiSuggestedFilters.search))}`);
    }
    if (typeof aiSuggestedFilters?.subscriptionActive === "boolean") {
      entries.push(`active=${encodeURIComponent(String(aiSuggestedFilters.subscriptionActive))}`);
    }
    if (typeof aiSuggestedFilters?.online === "boolean") {
      entries.push(`online=${encodeURIComponent(String(aiSuggestedFilters.online))}`);
    }
    return entries.join("&");
  }, [aiSuggestedFilters]);

  const getEmailSummarySpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      String(data?.summary || "").trim(),
      Array.isArray(data?.keyPoints) && data.keyPoints.length
        ? `Key points: ${data.keyPoints.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.actionItems) && data.actionItems.length
        ? `Action items: ${data.actionItems.slice(0, 4).join(". ")}`
        : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  const getEmailDraftSpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      data?.subject ? `Subject: ${String(data.subject).trim()}` : "",
      String(data?.preview || "").trim(),
      String(data?.body || "").trim(),
    ]
      .filter(Boolean)
      .join(". ");
  };

  const cards = [
    {
      id: "patients",
      title: "Patients",
      value: totals.patients || 0,
      icon: Users,
      color: theme.primary,
      route: "/(app)/(admin)/users?role=PATIENT",
    },
    {
      id: "medics",
      title: "Medics",
      value: totals.medics || 0,
      icon: Stethoscope,
      color: theme.accent,
      route: "/(app)/(admin)/users?role=MEDIC",
    },
    {
      id: "hospitals",
      title: "Hospitals",
      value: totals.hospitals || 0,
      icon: Hospital,
      color: theme.success,
      route: "/(app)/(admin)/users?role=HOSPITAL_ADMIN",
    },
    {
      id: "pharmacies",
      title: "Pharmacies",
      value: totals.pharmacies || 0,
      icon: Store,
      color: theme.warning,
      route: "/(app)/(admin)/users?role=PHARMACY_ADMIN",
    },
    {
      id: "online",
      title: "Online Now",
      value: overview?.onlineStatus?.online || 0,
      icon: Users,
      color: theme.success,
      route: "/(app)/(shared)/online-users",
    },
  ];
  const sidebarLinks = [
    { key: "dashboard", title: "Dashboard", href: "/(app)/(admin)", icon: Home },
    { key: "users", title: "Users", href: "/(app)/(admin)/users", icon: Users },
    { key: "online-users", title: "Online Users", href: "/(app)/(shared)/online-users", icon: Users },
    { key: "ai-finder", title: "AI Finder", href: "/(app)/(shared)/ai-finder", icon: Sparkles },
    { key: "ai-settings", title: "AI Settings", href: "/(app)/(admin)/ai-settings", icon: Volume2 },
    { key: "products", title: "Products", href: "/(app)/(admin)/products", icon: Store },
    { key: "jobs", title: "Jobs", href: "/(app)/(shared)/jobs", icon: Briefcase },
    { key: "subscriptions", title: "Subscriptions", href: "/(app)/(admin)/subscriptions", icon: CreditCard },
    { key: "control-center", title: "Control Center", href: "/(app)/(admin)/control-center", icon: ShieldAlert },
    { key: "complaints", title: "Complaints", href: "/(app)/(admin)/complaints", icon: ShieldAlert },
    { key: "audit", title: "Audit Logs", href: "/(app)/(admin)/audit-logs", icon: Settings },
    { key: "chat", title: "Chat", href: "/(app)/(shared)/conversations", icon: MessageCircle },
    { key: "notifications", title: "Notifications", href: "/(app)/(admin)/notifications", icon: Bell },
    { key: "email-center", title: "Email Center", href: "/(app)/(admin)/email-center", icon: Mail },
    { key: "video", title: "Video Call", href: "/(app)/(admin)/video-call", icon: Video },
    { key: "settings", title: "Settings", href: "/(app)/(admin)/settings", icon: Settings },
  ];

  return (
    <ScreenLayout>
      <View style={{ flex: 1, flexDirection: isWide ? "row" : "column" }}>
        {isWide && (
          <View
            style={{
              width: 240,
              paddingTop: insets.top + 20,
              paddingBottom: 24,
              paddingHorizontal: 16,
              borderRightWidth: 1,
              borderRightColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
                marginBottom: 16,
              }}
            >
              Admin Menu
            </Text>
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <TouchableOpacity
                  key={link.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 6,
                    backgroundColor: active ? theme.surface : "transparent",
                  }}
                  onPress={() => router.push(link.href)}
                  activeOpacity={0.8}
                >
                  <Icon color={active ? theme.primary : theme.iconColor} size={18} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.text,
                      marginLeft: 12,
                      flex: 1,
                    }}
                  >
                    {link.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Crown color={theme.primary} size={24} />
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                }}
              >
                {t("admin_dashboard")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <UserAvatar
                user={avatarUser}
                size={44}
                backgroundColor={theme.surface}
                borderColor={theme.border}
                textColor={theme.textSecondary}
              />
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/notifications")}
              >
                <Bell color={theme.iconColor} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/video-call")}
              >
                <Video color={theme.iconColor} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(app)/(admin)/settings")}
              >
                <Settings color={theme.iconColor} size={20} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              {timeGreeting}, {firstName}. Monitor and control the entire Medilink ecosystem.
            </Text>
            <UserAvatar
              user={avatarUser}
              size={32}
              backgroundColor={theme.surface}
              borderColor={theme.border}
              textColor={theme.textSecondary}
            />
          </View>
          <OnlineStatusChip isOnline={isOnline} theme={theme} style={{ marginTop: 10 }} />
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(admin)/control-center")}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldAlert color={theme.primary} size={18} />
              <Text
                style={{
                  marginLeft: 8,
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Open Admin Control Center
              </Text>
            </View>
            <Text style={{ color: theme.primary, fontSize: 12 }}>Manage</Text>
          </TouchableOpacity>
          <View
            style={{
              backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                }}
              >
                Subscription Revenue
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                  marginTop: 4,
                }}
              >
                {revenue.currency || "KES"} {revenue.total || 0}
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${theme.primary}15`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CreditCard color={theme.primary} size={22} />
            </View>
          </View>

        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            User Counts
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            {cards.map((card, index) => (
              <MotiView
                key={card.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 500, delay: index * 100 }}
                style={{ width: "47%" }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => router.push(card.route)}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${card.color}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <card.icon color={card.color} size={20} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                    }}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: "Nunito_700Bold",
                      color: theme.text,
                      marginTop: 4,
                    }}
                  >
                    {card.value}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Medics Hired
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Filters
            </Text>
            <TextInput
              value={hireFilters.search}
              onChangeText={(value) => setHireFilters((prev) => ({ ...prev, search: value }))}
              placeholder="Search medic or hospital"
              placeholderTextColor={theme.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                color: theme.text,
                backgroundColor: theme.surface,
                fontSize: 12,
                marginBottom: 8,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TextInput
                value={hireFilters.start}
                onChangeText={(value) => setHireFilters((prev) => ({ ...prev, start: value }))}
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
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
                value={hireFilters.end}
                onChangeText={(value) => setHireFilters((prev) => ({ ...prev, end: value }))}
                placeholder="End YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
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
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {["ALL", "HIRED", "PENDING", "COMPLETED", "CANCELLED"].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setHireFilters((prev) => ({ ...prev, status }))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: hireFilters.status === status ? theme.primary : theme.border,
                    backgroundColor:
                      hireFilters.status === status ? `${theme.primary}20` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: hireFilters.status === status ? theme.primary : theme.textSecondary }}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {operationsQuery.isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : latestHires.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                No hires recorded yet.
              </Text>
            ) : (
              latestHires.map((hire) => (
                <View
                  key={hire.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {hire.medicName || "Medic"} • {hire.status || "HIRED"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Hired by: {hire.hospitalName || hire.hospitalAdminId || "Unknown"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                    {formatDateTime ? formatDateTime(hire.createdAt) : hire.createdAt}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity
              style={{ marginTop: 10 }}
              onPress={() => router.push("/(app)/(admin)/audit-logs")}
            >
              <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                View all hiring activity
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Payments Activity
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Filters
            </Text>
            <TextInput
              value={paymentFilters.search}
              onChangeText={(value) => setPaymentFilters((prev) => ({ ...prev, search: value }))}
              placeholder="Search payer, recipient, or reason"
              placeholderTextColor={theme.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                color: theme.text,
                backgroundColor: theme.surface,
                fontSize: 12,
                marginBottom: 8,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TextInput
                value={paymentFilters.start}
                onChangeText={(value) => setPaymentFilters((prev) => ({ ...prev, start: value }))}
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
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
                value={paymentFilters.end}
                onChangeText={(value) => setPaymentFilters((prev) => ({ ...prev, end: value }))}
                placeholder="End YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
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
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {["ALL", "PAID", "PENDING", "FAILED", "CANCELLED", "CANCELED"].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setPaymentFilters((prev) => ({ ...prev, status }))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: paymentFilters.status === status ? theme.primary : theme.border,
                    backgroundColor:
                      paymentFilters.status === status ? `${theme.primary}20` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: paymentFilters.status === status ? theme.primary : theme.textSecondary }}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {["ALL", "PATIENT", "MEDIC", "HOSPITAL_ADMIN", "PHARMACY_ADMIN", "SUPER_ADMIN"].map(
                (role) => (
                  <TouchableOpacity
                    key={`payer-${role}`}
                    onPress={() => setPaymentFilters((prev) => ({ ...prev, payerRole: role }))}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        paymentFilters.payerRole === role ? theme.primary : theme.border,
                      backgroundColor:
                        paymentFilters.payerRole === role ? `${theme.primary}20` : theme.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color:
                          paymentFilters.payerRole === role ? theme.primary : theme.textSecondary,
                      }}
                    >
                      Payer: {role}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {["ALL", "PATIENT", "MEDIC", "HOSPITAL_ADMIN", "PHARMACY_ADMIN", "SUPER_ADMIN"].map(
                (role) => (
                  <TouchableOpacity
                    key={`recipient-${role}`}
                    onPress={() => setPaymentFilters((prev) => ({ ...prev, recipientRole: role }))}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        paymentFilters.recipientRole === role ? theme.primary : theme.border,
                      backgroundColor:
                        paymentFilters.recipientRole === role ? `${theme.primary}20` : theme.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color:
                          paymentFilters.recipientRole === role
                            ? theme.primary
                            : theme.textSecondary,
                      }}
                    >
                      Recipient: {role}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {["ALL", "SUBSCRIPTION", "ORDER", "VIDEO_CALL", "TRANSFER", "PAYMENT"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setPaymentFilters((prev) => ({ ...prev, type }))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: paymentFilters.type === type ? theme.primary : theme.border,
                    backgroundColor:
                      paymentFilters.type === type ? `${theme.primary}20` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: paymentFilters.type === type ? theme.primary : theme.textSecondary }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {paymentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : recentPayments.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                No payments recorded yet.
              </Text>
            ) : (
              recentPayments.map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {payment.payerEmail || payment.userId || "Unknown payer"} • {payment.currency || "KES"}{" "}
                    {payment.amount || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Reason: {payment.description || payment.type || "Payment"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                    {payment.payerRole || "Unknown"} → {payment.recipientRole || "N/A"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                    {formatDateTime ? formatDateTime(payment.createdAt) : payment.createdAt}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity
              style={{ marginTop: 10 }}
              onPress={() => router.push("/(app)/(admin)/subscriptions")}
            >
              <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                View subscriptions & payments
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            AI Features
          </Text>
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Sparkles color={theme.primary} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    AI Status: {aiEnabled ? "Enabled" : "Disabled"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Powered by {aiProviderLabel}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => aiUpdateMutation.mutate(!aiEnabled)}
                disabled={aiBusy}
                style={{
                  backgroundColor: aiEnabled ? theme.error : theme.primary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: aiBusy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                  {aiEnabled ? "Disable AI" : "Enable AI"}
                </Text>
              </TouchableOpacity>
            </View>
            {aiBlockedReason ? (
              <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                {aiBlockedReason}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(admin)/ai-settings")}
              style={{
                marginTop: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 9,
                alignItems: "center",
                backgroundColor: theme.surface,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Open AI Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(app)/(shared)/ai-finder")}
              style={{
                marginTop: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 9,
                alignItems: "center",
                backgroundColor: theme.surface,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Open AI Finder
              </Text>
            </TouchableOpacity>

            <View
              style={{
                marginTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                paddingTop: 10,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  marginBottom: 8,
                }}
              >
                Model Voice (Admin)
              </Text>
              {(aiVoiceConfigQuery.data?.options || []).map((option) => {
                const optionModel = String(option?.model || "");
                const isSelected = selectedAiVoiceModel === optionModel;
                const isUnavailable = option?.exists === false;
                return (
                  <TouchableOpacity
                    key={option?.id || optionModel}
                    onPress={() => setSelectedAiVoiceModel(optionModel)}
                    disabled={!optionModel || isUnavailable}
                    style={{
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? `${theme.primary}22` : theme.surface,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      marginBottom: 8,
                      opacity: isUnavailable ? 0.55 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? theme.primary : theme.text,
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {String(option?.label || "Voice")}
                      {option?.isDefault ? " (Default)" : ""}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                      {isUnavailable ? "Model file not found on server." : "Available"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {(aiVoiceConfigQuery.data?.options || []).length > 0 ? (
                <TouchableOpacity
                  onPress={() =>
                    speakAiText("Hello, I am Medilink AI voice preview.", {
                      forceServer: true,
                      model: selectedAiVoiceModel,
                    })
                  }
                  disabled={!selectedAiVoiceModel || aiSpeaking}
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
              ) : (
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 8 }}>
                  No model voices found. Set backend `PIPER_MODEL` and `PIPER_MODEL_VARIANTS`, then restart backend.
                </Text>
              )}

              <TouchableOpacity
                onPress={() => aiVoiceUpdateMutation.mutate(selectedAiVoiceModel)}
                disabled={
                  !selectedAiVoiceModel ||
                  aiVoiceUpdateMutation.isLoading ||
                  aiVoiceConfigQuery.isLoading
                }
                style={{
                  borderRadius: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                  backgroundColor: theme.primary,
                  opacity:
                    !selectedAiVoiceModel ||
                    aiVoiceUpdateMutation.isLoading ||
                    aiVoiceConfigQuery.isLoading
                      ? 0.6
                      : 1,
                }}
              >
                <Text style={{ fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                  Apply Selected Voice
                </Text>
              </TouchableOpacity>
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
            <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              AI User Search and Filter
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
              Describe the users you want (example: unverified medics in Nairobi with inactive subscription).
            </Text>
            <TextInput
              value={aiUserQuery}
              onChangeText={setAiUserQuery}
              placeholder="Search request..."
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
                backgroundColor: theme.surface,
              }}
            />
            <TouchableOpacity
              onPress={() => aiUserAssistantMutation.mutate(aiUserQuery.trim())}
              disabled={!aiCanUse || !aiUserQuery.trim() || aiUserAssistantMutation.isLoading}
              style={{
                marginTop: 10,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: theme.primary,
                opacity: !aiCanUse || !aiUserQuery.trim() ? 0.6 : 1,
              }}
            >
              {aiUserAssistantMutation.isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                  Run AI User Search
                </Text>
              )}
            </TouchableOpacity>

            {aiUserResponse ? (
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Matched users: {Number(aiUserResponse?.totalMatched || 0)}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: theme.textSecondary }}>
                  Suggested filters: role={aiSuggestedFilters?.role || "any"} • status=
                  {aiSuggestedFilters?.status || "any"} • verified=
                  {typeof aiSuggestedFilters?.verified === "boolean"
                    ? String(aiSuggestedFilters.verified)
                    : "any"}{" "}
                  • subscriptionActive=
                  {typeof aiSuggestedFilters?.subscriptionActive === "boolean"
                    ? String(aiSuggestedFilters.subscriptionActive)
                    : "any"}
                </Text>

                <View style={{ marginTop: 8, gap: 6 }}>
                  {(Array.isArray(aiUserResponse?.results) ? aiUserResponse.results : [])
                    .slice(0, 6)
                    .map((item) => (
                      <Text key={item.id} style={{ fontSize: 12, color: theme.text }}>
                        {item.fullName} • {item.email} • {item.role} • {item.status}
                      </Text>
                    ))}
                </View>

                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/(app)/(admin)/users${aiSuggestedQueryParams ? `?${aiSuggestedQueryParams}` : ""}`,
                    )
                  }
                  style={{
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    backgroundColor: theme.card,
                    paddingVertical: 9,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    Open Users List with AI Filters
                  </Text>
                </TouchableOpacity>
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
            <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              AI Help Desk and Task Automation
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
              Ask app questions or request tasks like: "filter suspended medics", "create support ticket for login issue",
              "export compliance snapshot", "disable feature flag ai_voice_enabled".
            </Text>
            <TextInput
              value={helpDeskQuery}
              onChangeText={setHelpDeskQuery}
              placeholder="Ask Medilink AI help desk..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                marginTop: 10,
                minHeight: 85,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingTop: 10,
                color: theme.text,
                fontSize: 13,
                backgroundColor: theme.surface,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => aiHelpDeskMutation.mutate({ query: helpDeskQuery.trim(), execute: false })}
                disabled={
                  !aiCanUse ||
                  !helpDeskQuery.trim() ||
                  aiHelpDeskMutation.isLoading ||
                  helpDeskVoiceToTextMutation.isPending
                }
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: theme.primary,
                  opacity:
                    !aiCanUse ||
                    !helpDeskQuery.trim() ||
                    aiHelpDeskMutation.isLoading ||
                    helpDeskVoiceToTextMutation.isPending
                      ? 0.6
                      : 1,
                }}
              >
                {aiHelpDeskMutation.isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                    Ask Help Desk
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => aiHelpDeskMutation.mutate({ query: helpDeskQuery.trim(), execute: true })}
                disabled={
                  !aiCanUse ||
                  !helpDeskQuery.trim() ||
                  aiHelpDeskMutation.isLoading ||
                  helpDeskVoiceToTextMutation.isPending
                }
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: theme.success,
                  opacity:
                    !aiCanUse ||
                    !helpDeskQuery.trim() ||
                    aiHelpDeskMutation.isLoading ||
                    helpDeskVoiceToTextMutation.isPending
                      ? 0.6
                      : 1,
                }}
              >
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                  Auto-Run Task
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleHelpDeskVoice}
                disabled={!aiCanUse || aiHelpDeskMutation.isLoading || helpDeskVoiceToTextMutation.isPending}
                style={{
                  width: 48,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isHelpDeskVoiceRecording ? theme.error : theme.border,
                  backgroundColor: isHelpDeskVoiceRecording ? `${theme.error}1A` : theme.card,
                  opacity:
                    !aiCanUse || aiHelpDeskMutation.isLoading || helpDeskVoiceToTextMutation.isPending
                      ? 0.6
                      : 1,
                }}
              >
                <Mic color={isHelpDeskVoiceRecording ? theme.error : theme.iconColor} size={16} />
              </TouchableOpacity>
            </View>
            {(isHelpDeskVoiceRecording || helpDeskVoiceToTextMutation.isPending) && (
              <Text style={{ marginTop: 8, fontSize: 11, color: theme.textSecondary }}>
                {isHelpDeskVoiceRecording
                  ? "Recording voice command..."
                  : "Transcribing and executing task..."}
              </Text>
            )}

            {helpDeskResponse ? (
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Intent: {String(helpDeskResponse?.intent || "help")}
                </Text>
                <Text style={{ marginTop: 5, fontSize: 12, color: theme.text }}>
                  {String(helpDeskResponse?.answer || "")}
                </Text>

                {helpDeskResponse?.data?.subject ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                      Draft Subject: {String(helpDeskResponse.data.subject)}
                    </Text>
                  </View>
                ) : null}

                {Array.isArray(helpDeskResponse?.actions) && helpDeskResponse.actions.length ? (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {helpDeskResponse.actions.map((action, idx) => (
                      <Text key={`${String(action?.type || "ACTION")}-${idx}`} style={{ fontSize: 11, color: theme.textSecondary }}>
                        Action: {String(action?.type || "ACTION")}
                        {action?.flag ? ` (${String(action.flag)}=${String(action?.value)})` : ""}
                        {action?.scope ? ` (${String(action.scope)})` : ""}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {Array.isArray(helpDeskResponse?.executionReports) &&
                helpDeskResponse.executionReports.length ? (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {helpDeskResponse.executionReports.map((line, idx) => (
                      <Text key={`exec-${idx}`} style={{ fontSize: 11, color: theme.textSecondary }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : null}
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
            <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              AI Email Reader
            </Text>
            <TextInput
              value={aiEmailInput}
              onChangeText={setAiEmailInput}
              placeholder="Paste incoming email here for summary..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                marginTop: 10,
                minHeight: 110,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingTop: 10,
                color: theme.text,
                fontSize: 13,
                backgroundColor: theme.surface,
              }}
            />
            <TouchableOpacity
              onPress={() => aiEmailReadMutation.mutate(aiEmailInput.trim())}
              disabled={!aiCanUse || !aiEmailInput.trim() || aiEmailReadMutation.isLoading}
              style={{
                marginTop: 10,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: theme.primary,
                opacity: !aiCanUse || !aiEmailInput.trim() ? 0.6 : 1,
              }}
            >
              {aiEmailReadMutation.isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                  Summarize Email with AI
                </Text>
              )}
            </TouchableOpacity>
            {aiEmailReadResponse ? (
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                }}
              >
                <TouchableOpacity
                  onPress={() => speakAiText(getEmailSummarySpeechText(aiEmailReadResponse))}
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
                    backgroundColor: theme.card,
                    opacity: aiSpeaking ? 0.7 : 1,
                  }}
                >
                  <Volume2 color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                    {aiSpeaking ? "Reading..." : "Read Summary"}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: theme.text }}>{aiEmailReadResponse?.summary}</Text>
                {Array.isArray(aiEmailReadResponse?.actionItems) &&
                aiEmailReadResponse.actionItems.length ? (
                  <Text style={{ marginTop: 6, fontSize: 11, color: theme.textSecondary }}>
                    Actions: {aiEmailReadResponse.actionItems.join(" • ")}
                  </Text>
                ) : null}
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
            <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              AI Email Writer
            </Text>
            <TextInput
              value={aiEmailBrief}
              onChangeText={setAiEmailBrief}
              placeholder="Describe what email you want to send..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                marginTop: 10,
                minHeight: 95,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingTop: 10,
                color: theme.text,
                fontSize: 13,
                backgroundColor: theme.surface,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                value={aiEmailTone}
                onChangeText={setAiEmailTone}
                placeholder="tone"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: theme.text,
                  fontSize: 12,
                  backgroundColor: theme.surface,
                }}
              />
              <TextInput
                value={aiEmailAudience}
                onChangeText={setAiEmailAudience}
                placeholder="audience"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: theme.text,
                  fontSize: 12,
                  backgroundColor: theme.surface,
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() =>
                aiEmailDraftMutation.mutate({
                  brief: aiEmailBrief.trim(),
                  tone: aiEmailTone.trim(),
                  audience: aiEmailAudience.trim(),
                })
              }
              disabled={!aiCanUse || !aiEmailBrief.trim() || aiEmailDraftMutation.isLoading}
              style={{
                marginTop: 10,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: theme.primary,
                opacity: !aiCanUse || !aiEmailBrief.trim() ? 0.6 : 1,
              }}
            >
              {aiEmailDraftMutation.isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                  Draft Email with AI
                </Text>
              )}
            </TouchableOpacity>

            {aiEmailDraftResponse ? (
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                }}
              >
                <TouchableOpacity
                  onPress={() => speakAiText(getEmailDraftSpeechText(aiEmailDraftResponse))}
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
                    backgroundColor: theme.card,
                    opacity: aiSpeaking ? 0.7 : 1,
                  }}
                >
                  <Volume2 color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                    {aiSpeaking ? "Reading..." : "Read Draft"}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                  Subject: {aiEmailDraftResponse?.subject || "(no subject)"}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.text }}>
                  {aiEmailDraftResponse?.body || ""}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(app)/(admin)/email-center")}
                  style={{
                    marginTop: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 8,
                    alignItems: "center",
                    backgroundColor: theme.card,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    Open Email Center
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Best Performing
          </Text>
          <View style={{ gap: 12 }}>
            {[{ label: "Hospitals", data: top.hospitals }, { label: "Medics", data: top.medics }, { label: "Pharmacies", data: top.pharmacies }].map(
              (section) => (
                <View
                  key={section.label}
                  style={{
                    backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      marginBottom: 8,
                    }}
                  >
                    {section.label}
                  </Text>
                  {(section.data || []).length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                      }}
                    >
                      No data yet.
                    </Text>
                  ) : (
                    (section.data || []).map((item) => (
                      <View
                        key={item.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: theme.text,
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.primary,
                          }}
                        >
                          {item.score}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              ),
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Admin Actions
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Open Patient Dashboard", route: "/(app)/(patient)" },
              { label: "Open Medic Dashboard", route: "/(app)/(medic)" },
              { label: "Open Hospital Dashboard", route: "/(app)/(hospital)" },
              { label: "Open Pharmacy Dashboard", route: "/(app)/(pharmacy)" },
              { label: "All Users", route: "/(app)/(admin)/users" },
              { label: "Subscriptions", route: "/(app)/(admin)/subscriptions" },
              { label: "Audit Logs", route: "/(app)/(admin)/audit-logs" },
              { label: "Complaints", route: "/(app)/(admin)/complaints" },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => router.push(item.route)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
