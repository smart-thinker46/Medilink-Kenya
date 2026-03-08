import React, { useMemo, useState } from "react";
import { Alert, View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import {
  CheckCircle,
  Ban,
  Mail,
  Search,
  MessageCircle,
  Video,
  Square,
  CheckSquare,
  Trash2,
  Mic,
  Sparkles,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAudioRecorder, RecordingPresets } from "expo-audio";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { shareCsv, emailCsv } from "@/utils/csvExport";
import { useVideoCall } from "@/utils/useVideoCall";
import VideoCall from "@/components/VideoCall";
import { useOnlineUsers } from "@/utils/useOnlineUsers";

const roleOptions = [
  { label: "All", value: "" },
  { label: "Patients", value: "PATIENT" },
  { label: "Medics", value: "MEDIC" },
  { label: "Hospitals", value: "HOSPITAL_ADMIN" },
  { label: "Pharmacies", value: "PHARMACY_ADMIN" },
];

const statusOptions = [
  { label: "All", value: "" },
  { label: "Active Sub", value: "true" },
  { label: "Inactive Sub", value: "false" },
];
const accountStatusOptions = [
  { label: "All Status", value: "" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
];
const onlineOptions = [
  { label: "All Presence", value: "" },
  { label: "Online", value: "true" },
  { label: "Offline", value: "false" },
];
const editableRoles = [
  "PATIENT",
  "MEDIC",
  "HOSPITAL_ADMIN",
  "PHARMACY_ADMIN",
  "SUPER_ADMIN",
];

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { initiateCall } = useVideoCall();
  const { isUserOnline } = useOnlineUsers();

  const getParam = (value, fallback = "") => {
    if (Array.isArray(value)) {
      return String(value[0] ?? fallback);
    }
    return String(value ?? fallback);
  };

  const paramRole = getParam(params?.role, "");
  const paramActive = getParam(params?.active, "");
  const paramSearch = getParam(params?.search, "");
  const paramStatus = getParam(params?.status, "");
  const paramOnline = getParam(params?.online, "");
  const paramStartDate = getParam(params?.startDate, "");
  const paramEndDate = getParam(params?.endDate, "");

  const [roleFilter, setRoleFilter] = useState(paramRole);
  const [activeFilter, setActiveFilter] = useState(paramActive);
  const [search, setSearch] = useState(paramSearch);
  const [statusFilter, setStatusFilter] = useState(paramStatus);
  const [onlineFilter, setOnlineFilter] = useState(paramOnline);
  const [startDate, setStartDate] = useState(paramStartDate);
  const [endDate, setEndDate] = useState(paramEndDate);
  const [expandedId, setExpandedId] = useState(null);
  const [editDrafts, setEditDrafts] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "PATIENT",
    password: "",
    status: "active",
  });
  const [emailComposer, setEmailComposer] = useState({
    to: "",
    subject: "",
    message: "",
    userName: "",
    userId: "",
    visible: false,
  });
  const [aiUserResponse, setAiUserResponse] = useState(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const webMediaRecorderRef = React.useRef(null);
  const webMediaStreamRef = React.useRef(null);
  const webAudioChunksRef = React.useRef([]);

  React.useEffect(() => {
    setPage(1);
  }, [roleFilter, activeFilter, search, statusFilter, onlineFilter, startDate, endDate, pageSize, sortOrder]);

  React.useEffect(() => {
    if (
      paramRole ||
      paramActive ||
      paramSearch ||
      paramStatus ||
      paramOnline ||
      paramStartDate ||
      paramEndDate
    ) {
      setRoleFilter(paramRole);
      setActiveFilter(paramActive);
      setSearch(paramSearch);
      setStatusFilter(paramStatus);
      setOnlineFilter(paramOnline);
      setStartDate(paramStartDate);
      setEndDate(paramEndDate);
      setPage(1);
    }
  }, [paramRole, paramActive, paramSearch, paramStatus, paramOnline, paramStartDate, paramEndDate]);

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

  const applyPreset = (days) => {
    if (!days) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    const format = (date) => date.toISOString().slice(0, 10);
    setStartDate(format(start));
    setEndDate(format(now));
  };

  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: [
      "admin-users",
      roleFilter,
      activeFilter,
      search,
      statusFilter,
      onlineFilter,
      startDate,
      endDate,
      sortOrder,
      page,
      pageSize,
    ],
    queryFn: () =>
      apiClient.getAdminUsers({
        role: roleFilter || undefined,
        active: activeFilter || undefined,
        search: search || undefined,
        status: statusFilter || undefined,
        online: onlineFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sort: sortOrder,
        page,
        pageSize,
      }),
  });

  const usersResponse = usersQuery.data || {};
  const users = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse.items || [];
  const totalUsers = Array.isArray(usersResponse)
    ? users.length
    : usersResponse.total || users.length;

  const filteredUsers = useMemo(() => users, [users]);
  const currentPageIds = useMemo(
    () => filteredUsers.map((user) => user.id).filter(Boolean),
    [filteredUsers],
  );
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  const verifyMutation = useMutation({
    mutationFn: ({ userId, verified }) => apiClient.verifyAdminUser(userId, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, blocked }) => apiClient.blockAdminUser(userId, blocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: ({ userIds, verified }) =>
      apiClient.verifyAdminUsersBulk(userIds, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }) => apiClient.adminUpdateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload) => apiClient.adminCreateUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => apiClient.adminDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload) => apiClient.adminDeleteUsersBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (payload) => apiClient.adminSendEmail(payload),
  });

  const applyAiUserSuggestionFilters = (assistantData, sourceQuery = "") => {
    const filters = assistantData?.suggestedFilters || {};
    const queryText = String(sourceQuery || "").trim();
    const lowerQuery = queryText.toLowerCase();

    if (filters?.role) setRoleFilter(String(filters.role).toUpperCase());
    if (filters?.status) setStatusFilter(String(filters.status).toLowerCase());
    if (typeof filters?.subscriptionActive === "boolean") {
      setActiveFilter(filters.subscriptionActive ? "true" : "false");
    }

    const explicitOnline =
      typeof filters?.online === "boolean"
        ? filters.online
        : lowerQuery.includes("online")
          ? true
          : lowerQuery.includes("offline")
            ? false
            : null;
    if (explicitOnline !== null) {
      setOnlineFilter(explicitOnline ? "true" : "false");
    }

    const topResult = Array.isArray(assistantData?.results) ? assistantData.results[0] : null;
    const fallbackSearch =
      String(topResult?.fullName || topResult?.name || topResult?.email || "").trim();
    const inferredSearch = String(filters?.search || fallbackSearch || queryText).trim();
    if (inferredSearch) {
      setSearch(inferredSearch);
    }
    setPage(1);
  };

  const aiUserSearchMutation = useMutation({
    mutationFn: (queryText) => apiClient.aiAdminUsersAssistant({ query: queryText }),
    onSuccess: (data, queryText) => {
      setAiUserResponse(data || null);
      applyAiUserSuggestionFilters(data || {}, queryText);
      const matched = Number(data?.totalMatched || 0);
      showToast(
        matched > 0
          ? `AI found ${matched} matching user(s).`
          : "AI applied filters, but no users matched.",
        matched > 0 ? "success" : "warning",
      );
    },
    onError: (error) => {
      showToast(error?.message || "AI user search failed.", "error");
    },
  });

  const sttVoiceSearchMutation = useMutation({
    mutationFn: (input) => {
      if (Platform.OS === "web") {
        if (typeof Blob !== "undefined" && input instanceof Blob) {
          return apiClient.aiVoiceStt({
            file: input,
            name: "admin-user-search.webm",
            type: input.type || "audio/webm",
            language: "en",
          });
        }
        throw new Error("Web voice search recording is missing.");
      }
      const uri = String(input || "").trim();
      if (!uri) {
        throw new Error("Audio recording not found.");
      }
      return apiClient.aiVoiceStt({
        uri,
        name: "admin-user-search.m4a",
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
      setSearch(transcript);
      aiUserSearchMutation.mutate(transcript);
    },
    onError: (error) => {
      showToast(error?.message || "Voice transcription failed.", "error");
    },
  });

  const runAiSearchFromText = () => {
    const queryText = String(search || "").trim();
    if (!queryText) {
      showToast("Type what user you want to find first.", "warning");
      return;
    }
    aiUserSearchMutation.mutate(queryText);
  };

  const stopWebRecorder = async () => {
    const recorder = webMediaRecorderRef.current;
    if (!recorder) {
      throw new Error("Recorder not initialized.");
    }
    const stream = webMediaStreamRef.current;
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const audioBlob = new Blob(webAudioChunksRef.current || [], {
            type: recorder.mimeType || "audio/webm",
          });
          webAudioChunksRef.current = [];
          webMediaRecorderRef.current = null;
          if (stream?.getTracks) {
            stream.getTracks().forEach((track) => track.stop());
          }
          webMediaStreamRef.current = null;
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };
      recorder.onerror = () => {
        reject(new Error("Web recorder failed."));
      };
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
    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
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

  const toggleVoiceSearch = async () => {
    if (sttVoiceSearchMutation.isPending || aiUserSearchMutation.isPending) return;
    if (Platform.OS === "web") {
      if (isVoiceRecording) {
        try {
          const audioBlob = await stopWebRecorder();
          setIsVoiceRecording(false);
          sttVoiceSearchMutation.mutate(audioBlob);
        } catch (error) {
          setIsVoiceRecording(false);
          showToast(error?.message || "Failed to stop web voice recording.", "error");
        }
        return;
      }
      try {
        await startWebRecorder();
        setIsVoiceRecording(true);
        showToast("Listening... click mic again to stop.", "info");
      } catch (error) {
        setIsVoiceRecording(false);
        showToast(error?.message || "Unable to start web voice search.", "error");
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
        sttVoiceSearchMutation.mutate(uri);
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
      showToast(error?.message || "Unable to start voice search.", "error");
    }
  };

  const handleVerify = async (userId, verified) => {
    try {
      await verifyMutation.mutateAsync({ userId, verified });
      showToast(verified ? "User verified." : "Verification removed.", "success");
    } catch (error) {
      showToast(error.message || "Verification failed.", "error");
    }
  };

  const handleBlock = async (userId, blocked) => {
    try {
      await blockMutation.mutateAsync({ userId, blocked });
      showToast(blocked ? "User blocked." : "User unblocked.", "success");
    } catch (error) {
      showToast(error.message || "Action failed.", "error");
    }
  };

  const handleEditChange = (userId, field, value) => {
    setEditDrafts((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: value },
    }));
  };

  const toggleSelect = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectAllCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const bulkUpdate = async (blocked) => {
    if (selectedIds.size === 0) {
      showToast("Select at least one user.", "warning");
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          blockMutation.mutateAsync({ userId: id, blocked }),
        ),
      );
      showToast(blocked ? "Users blocked." : "Users unblocked.", "success");
      clearSelection();
    } catch (error) {
      showToast(error.message || "Bulk update failed.", "error");
    }
  };

  const bulkApprove = async (verified = true) => {
    if (selectedIds.size === 0) {
      showToast("Select at least one user.", "warning");
      return;
    }
    try {
      await bulkVerifyMutation.mutateAsync({
        userIds: Array.from(selectedIds),
        verified,
      });
      showToast(verified ? "Users approved." : "Users unapproved.", "success");
      clearSelection();
    } catch (error) {
      showToast(error.message || "Bulk approval failed.", "error");
    }
  };

  const handleBulkDeleteSelected = () => {
    if (selectedIds.size === 0) {
      showToast("Select at least one user.", "warning");
      return;
    }
    Alert.alert(
      "Delete selected users",
      `Delete ${selectedIds.size} selected users? This action is permanent.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await bulkDeleteMutation.mutateAsync({
                userIds: Array.from(selectedIds),
              });
              const deletedCount = Number(result?.deletedCount || 0);
              const failedCount = Array.isArray(result?.failed) ? result.failed.length : 0;
              if (deletedCount > 0) {
                showToast(
                  failedCount > 0
                    ? `Deleted ${deletedCount} user(s), ${failedCount} failed.`
                    : `Deleted ${deletedCount} user(s).`,
                  failedCount > 0 ? "warning" : "success",
                );
              } else {
                showToast("No users were deleted.", "warning");
              }
              clearSelection();
            } catch (error) {
              showToast(error?.message || "Bulk delete failed.", "error");
            }
          },
        },
      ],
    );
  };

  const handleDeleteAllFiltered = () => {
    if (totalUsers === 0) {
      showToast("No users match the current filters.", "warning");
      return;
    }
    Alert.alert(
      "Delete all filtered users",
      `Delete all ${totalUsers} users matching current filters? This action is permanent.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await bulkDeleteMutation.mutateAsync({
                deleteAll: true,
                filters: {
                  role: roleFilter || undefined,
                  active: activeFilter || undefined,
                  search: search || undefined,
                  status: statusFilter || undefined,
                  online: onlineFilter || undefined,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  sort: sortOrder || undefined,
                },
              });
              const deletedCount = Number(result?.deletedCount || 0);
              const failedCount = Array.isArray(result?.failed) ? result.failed.length : 0;
              if (deletedCount > 0) {
                showToast(
                  failedCount > 0
                    ? `Deleted ${deletedCount} user(s), ${failedCount} failed.`
                    : `Deleted ${deletedCount} user(s).`,
                  failedCount > 0 ? "warning" : "success",
                );
              } else {
                showToast("No users were deleted.", "warning");
              }
              clearSelection();
            } catch (error) {
              showToast(error?.message || "Delete-all failed.", "error");
            }
          },
        },
      ],
    );
  };

  const handleSaveUser = async (user) => {
    const draft = editDrafts[user.id] || {};
    const payload = {
      firstName: draft.firstName ?? user.firstName,
      lastName: draft.lastName ?? user.lastName,
      fullName: `${draft.firstName ?? user.firstName} ${draft.lastName ?? user.lastName}`.trim(),
      email: draft.email ?? user.email,
      phone: draft.phone ?? user.phone,
      role: draft.role ?? user.role,
      status: draft.status ?? user.status,
      password: draft.password || undefined,
    };
    try {
      await updateUserMutation.mutateAsync({ userId: user.id, payload });
      showToast("User updated.", "success");
      setEditDrafts((prev) => ({ ...prev, [user.id]: {} }));
    } catch (error) {
      showToast(error.message || "Update failed.", "error");
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      "Delete user",
      `Delete ${user?.email || "this user"}? This action is permanent and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserMutation.mutateAsync(user.id);
              showToast("User deleted.", "success");
              setExpandedId((prev) => (prev === user.id ? null : prev));
              setSelectedIds((prev) => {
                if (!prev.has(user.id)) return prev;
                const next = new Set(prev);
                next.delete(user.id);
                return next;
              });
            } catch (error) {
              showToast(error?.message || "Failed to delete user.", "error");
            }
          },
        },
      ],
    );
  };

  const handleCreateUser = async () => {
    const payload = {
      firstName: createDraft.firstName,
      lastName: createDraft.lastName,
      fullName: `${createDraft.firstName} ${createDraft.lastName}`.trim(),
      email: createDraft.email,
      phone: createDraft.phone,
      role: createDraft.role,
      status: createDraft.status,
      password: createDraft.password,
    };
    try {
      await createUserMutation.mutateAsync(payload);
      showToast("User created.", "success");
      setShowCreate(false);
      setCreateDraft({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "PATIENT",
        password: "",
        status: "active",
      });
    } catch (error) {
      showToast(error.message || "Create failed.", "error");
    }
  };

  const handleStartCall = async (user) => {
    try {
      await initiateCall({
        participantId: user.id,
        participantName: `${user.firstName} ${user.lastName}`.trim() || user.email,
        participantRole: user.role,
        type: "consultation",
        role: "host",
        minutes: 30,
      });
    } catch (error) {
      showToast(error.message || "Failed to start call.", "error");
    }
  };

  const openEmailComposer = (user) => {
    if (!user?.email) {
      showToast("This user has no email address.", "warning");
      return;
    }
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    setEmailComposer({
      to: user.email,
      subject: "MediLink Support Update",
      message: `Hello ${fullName || "there"},\n\n`,
      userName: fullName || user.email,
      userId: user.id,
      visible: true,
    });
  };

  const closeEmailComposer = () => {
    setEmailComposer({
      to: "",
      subject: "",
      message: "",
      userName: "",
      userId: "",
      visible: false,
    });
  };

  const handleSendEmail = async () => {
    if (!emailComposer.to.trim()) {
      showToast("Recipient email is required.", "warning");
      return;
    }
    if (!emailComposer.subject.trim()) {
      showToast("Email subject is required.", "warning");
      return;
    }
    if (!emailComposer.message.trim()) {
      showToast("Email message is required.", "warning");
      return;
    }

    try {
      const result = await sendEmailMutation.mutateAsync({
        to: emailComposer.to.trim(),
        subject: emailComposer.subject.trim(),
        text: emailComposer.message.trim(),
      });
      if (result?.success === false) {
        throw new Error(result?.message || "Not authorized to send email.");
      }
      showToast("Email sent successfully.", "success");
      closeEmailComposer();
    } catch (error) {
      showToast(error?.message || "Failed to send email.", "error");
    }
  };

  const tableHeader = useMemo(
    () => (
      <View
        style={{
          flexDirection: "row",
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={{ width: 20 }} />
        {[
          "Name",
          "Role",
          "Location",
          "License",
          "Verified",
          "Active",
          "Actions",
        ].map((label) => (
          <Text
            key={label}
            style={{
              flex: 1,
              fontSize: 11,
              fontFamily: "Inter_600SemiBold",
              color: theme.textSecondary,
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    ),
    [theme],
  );

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          Users
        </Text>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
            <Search color={theme.iconColor} size={18} />
            <TextInput
              placeholder="Search by name/email or type AI prompt"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
              style={{
                marginLeft: 10,
                flex: 1,
                color: theme.text,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
              }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, width: "100%" }}>
            <TouchableOpacity
              onPress={runAiSearchFromText}
              disabled={aiUserSearchMutation.isPending || sttVoiceSearchMutation.isPending}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                backgroundColor: theme.primary,
                opacity:
                  aiUserSearchMutation.isPending || sttVoiceSearchMutation.isPending ? 0.7 : 1,
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
                {aiUserSearchMutation.isPending ? "AI Finding..." : "AI Find User"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleVoiceSearch}
              disabled={sttVoiceSearchMutation.isPending || aiUserSearchMutation.isPending}
              style={{
                width: 46,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: isVoiceRecording ? theme.error : theme.border,
                backgroundColor: isVoiceRecording ? `${theme.error}22` : theme.card,
                opacity:
                  sttVoiceSearchMutation.isPending || aiUserSearchMutation.isPending ? 0.7 : 1,
              }}
            >
              <Mic color={isVoiceRecording ? theme.error : theme.iconColor} size={16} />
            </TouchableOpacity>
          </View>
          {(sttVoiceSearchMutation.isPending || isVoiceRecording) && (
            <Text
              style={{
                marginTop: 8,
                width: "100%",
                color: theme.textSecondary,
                fontSize: 11,
                fontFamily: "Inter_500Medium",
              }}
            >
              {isVoiceRecording
                ? "Recording voice query..."
                : "Transcribing and searching users..."}
            </Text>
          )}
        </View>

        {aiUserResponse && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 10,
              marginTop: -4,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              AI Result: {Number(aiUserResponse?.totalMatched || 0)} match(es)
            </Text>
            {String(aiUserResponse?.notes || "").trim() ? (
              <Text
                style={{
                  marginTop: 4,
                  color: theme.textSecondary,
                  fontSize: 11,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {String(aiUserResponse?.notes || "").trim()}
              </Text>
            ) : null}
            {Array.isArray(aiUserResponse?.results) && aiUserResponse.results.length > 0 ? (
              <Text
                style={{
                  marginTop: 6,
                  color: theme.textSecondary,
                  fontSize: 11,
                }}
              >
                Top: {aiUserResponse.results.slice(0, 3).map((item) => item?.fullName || item?.name || item?.email).filter(Boolean).join(", ")}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => setAiUserResponse(null)}
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                paddingVertical: 5,
                paddingHorizontal: 8,
                backgroundColor: theme.surface,
              }}
            >
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Clear AI Result
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {roleOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  roleFilter === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  roleFilter === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setRoleFilter(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    roleFilter === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  activeFilter === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  activeFilter === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setActiveFilter(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    activeFilter === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              overflow: "hidden",
            }}
          >
            <Picker
              selectedValue={pageSize}
              onValueChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
              style={{ color: theme.text, height: 40 }}
              dropdownIconColor={theme.text}
            >
              {[10, 20, 50, 100].map((size) => (
                <Picker.Item key={size} label={`${size} per page`} value={size} />
              ))}
            </Picker>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              <Text style={{ color: page <= 1 ? theme.textTertiary : theme.primary }}>
                Prev
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Page {page} / {totalPages}
            </Text>
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              <Text style={{ color: page >= totalPages ? theme.textTertiary : theme.primary }}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {accountStatusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  statusFilter === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  statusFilter === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    statusFilter === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {onlineOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  onlineFilter === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  onlineFilter === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setOnlineFilter(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    onlineFilter === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor:
                roleFilter === "PATIENT" && onlineFilter === "true"
                  ? `${theme.success}22`
                  : theme.card,
              borderWidth: 1,
              borderColor:
                roleFilter === "PATIENT" && onlineFilter === "true"
                  ? theme.success
                  : theme.border,
            }}
            onPress={() => {
              setRoleFilter("PATIENT");
              setOnlineFilter("true");
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color:
                  roleFilter === "PATIENT" && onlineFilter === "true"
                    ? theme.success
                    : theme.textSecondary,
              }}
            >
              Online Patients
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              {startDate || "Start date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              {endDate || "End date"}
            </Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate ? new Date(startDate) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_event, date) => {
              setShowStartPicker(Platform.OS === "ios");
              if (date) {
                setStartDate(date.toISOString().slice(0, 10));
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate ? new Date(endDate) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_event, date) => {
              setShowEndPicker(Platform.OS === "ios");
              if (date) {
                setEndDate(date.toISOString().slice(0, 10));
              }
            }}
          />
        )}

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Last 7 days", value: 7 },
            { label: "Last 30 days", value: 30 },
            { label: "Clear", value: 0 },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => applyPreset(preset.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                }}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Newest", value: "newest" },
            { label: "Oldest", value: "oldest" },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  sortOrder === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  sortOrder === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setSortOrder(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    sortOrder === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: allCurrentPageSelected ? `${theme.primary}20` : theme.card,
              borderWidth: 1,
              borderColor: allCurrentPageSelected ? theme.primary : theme.border,
            }}
            onPress={toggleSelectAllCurrentPage}
            disabled={currentPageIds.length === 0}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: allCurrentPageSelected ? theme.primary : theme.textSecondary,
              }}
            >
              {allCurrentPageSelected ? "Unselect Page" : "Select Page"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: `${theme.error}15`,
              borderWidth: 1,
              borderColor: `${theme.error}40`,
            }}
            onPress={handleDeleteAllFiltered}
            disabled={totalUsers === 0 || bulkDeleteMutation.isPending}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.error }}>
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All Filtered"}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedIds.size > 0 && (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: `${theme.primary}15`,
                borderWidth: 1,
                borderColor: `${theme.primary}40`,
              }}
              onPress={() => bulkApprove(true)}
            >
              <Text style={{ fontSize: 11, color: theme.primary }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: `${theme.error}15`,
                borderWidth: 1,
                borderColor: `${theme.error}40`,
              }}
              onPress={() => bulkUpdate(true)}
            >
              <Text style={{ fontSize: 11, color: theme.error }}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: `${theme.success}15`,
                borderWidth: 1,
                borderColor: `${theme.success}40`,
              }}
              onPress={() => bulkUpdate(false)}
            >
              <Text style={{ fontSize: 11, color: theme.success }}>Unblock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: `${theme.error}15`,
                borderWidth: 1,
                borderColor: `${theme.error}40`,
              }}
              onPress={handleBulkDeleteSelected}
              disabled={bulkDeleteMutation.isPending}
            >
              <Text style={{ fontSize: 11, color: theme.error }}>
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={clearSelection}
            >
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: theme.primary,
            }}
            onPress={() => setShowCreate((prev) => !prev)}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: "#fff",
              }}
            >
              {showCreate ? "Close Create" : "Add User"}
            </Text>
          </TouchableOpacity>
        </View>

        {showCreate && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Create User
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TextInput
                placeholder="First name"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.firstName}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, firstName: value }))
                }
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
              <TextInput
                placeholder="Last name"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.lastName}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, lastName: value }))
                }
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.email}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, email: value }))
                }
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
              <TextInput
                placeholder="Phone"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.phone}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, phone: value }))
                }
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  overflow: "hidden",
                }}
              >
                <Picker
                  selectedValue={createDraft.role}
                  onValueChange={(value) =>
                    setCreateDraft((prev) => ({ ...prev, role: value }))
                  }
                  style={{ color: theme.text, height: 40 }}
                  dropdownIconColor={theme.text}
                >
                  {editableRoles.map((role) => (
                    <Picker.Item key={role} label={role} value={role} />
                  ))}
                </Picker>
              </View>
              <TextInput
                placeholder="Status (active/suspended)"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.status}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, status: value }))
                }
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
            </View>
            <View style={{ marginTop: 10 }}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={createDraft.password}
                onChangeText={(value) =>
                  setCreateDraft((prev) => ({ ...prev, password: value }))
                }
                secureTextEntry
                style={{
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 10,
                  color: theme.text,
                  fontSize: 12,
                }}
              />
            </View>
            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
              onPress={handleCreateUser}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Create User
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {emailComposer.visible && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Email {emailComposer.userName || "User"}
            </Text>
            <TextInput
              placeholder="Recipient"
              placeholderTextColor={theme.textSecondary}
              value={emailComposer.to}
              onChangeText={(value) =>
                setEmailComposer((prev) => ({ ...prev, to: value }))
              }
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 10,
                color: theme.text,
                marginBottom: 8,
              }}
            />
            <TextInput
              placeholder="Subject"
              placeholderTextColor={theme.textSecondary}
              value={emailComposer.subject}
              onChangeText={(value) =>
                setEmailComposer((prev) => ({ ...prev, subject: value }))
              }
              style={{
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 10,
                color: theme.text,
                marginBottom: 8,
              }}
            />
            <TextInput
              placeholder="Message"
              placeholderTextColor={theme.textSecondary}
              value={emailComposer.message}
              onChangeText={(value) =>
                setEmailComposer((prev) => ({ ...prev, message: value }))
              }
              multiline
              numberOfLines={5}
              style={{
                minHeight: 110,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 10,
                paddingTop: 10,
                color: theme.text,
                textAlignVertical: "top",
                marginBottom: 10,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  alignItems: "center",
                  paddingVertical: 10,
                  opacity: sendEmailMutation.isPending ? 0.7 : 1,
                }}
                onPress={handleSendEmail}
                disabled={sendEmailMutation.isPending}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                  {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={closeEmailComposer}
                disabled={sendEmailMutation.isPending}
              >
                <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
        {tableHeader}
          {(filteredUsers || []).map((user, index) => (
            <MotiView
              key={user.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 50 }}
              style={{
                paddingVertical: 10,
                borderBottomWidth: index === filteredUsers.length - 1 ? 0 : 1,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={() => toggleSelect(user.id)}
                  style={{ width: 20, alignItems: "center", marginRight: 6 }}
                >
                  {selectedIds.has(user.id) ? (
                    <CheckSquare color={theme.primary} size={16} />
                  ) : (
                    <Square color={theme.textSecondary} size={16} />
                  )}
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 11, color: theme.text }}>
                  {user.firstName} {user.lastName}
                </Text>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginTop: 3,
                    marginRight: 6,
                    backgroundColor: isUserOnline(user) ? "#22C55E" : theme.textSecondary,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>
                  {user.role}
                </Text>
                <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>
                  {user.location || "--"}
                </Text>
                <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>
                  {user.licenseNumber || "--"}
                </Text>
                <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>
                  {user.verified ? "Yes" : "No"}
                </Text>
                <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>
                  {user.subscriptionActive ? "Active" : "Inactive"}
                </Text>
                <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity onPress={() => handleVerify(user.id, !user.verified)}>
                    <CheckCircle
                      color={user.verified ? theme.success : theme.iconColor}
                      size={16}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleBlock(user.id, user.status !== "suspended")}
                  >
                    <Ban color={user.status === "suspended" ? theme.warning : theme.error} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteUser(user)}>
                    <Trash2 color={theme.error} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(app)/(admin)/chat?userId=${user.id}`)
                    }
                  >
                    <MessageCircle color={theme.iconColor} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleStartCall(user)}>
                    <Video color={theme.iconColor} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEmailComposer(user)}>
                    <Mail color={theme.iconColor} size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={{ marginTop: 6, alignSelf: "flex-start" }}
                onPress={() =>
                  setExpandedId((prev) => (prev === user.id ? null : user.id))
                }
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.primary,
                  }}
                >
                  {expandedId === user.id ? "Hide details" : "View details"}
                </Text>
              </TouchableOpacity>

              {expandedId === user.id && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Verified at: {user.verifiedAt || "Not verified"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    License file: {user.licenseFile || "Not uploaded"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    ID Photo: {user.idPhoto || user.idFront || user.idBack || "Not uploaded"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Status: {user.status || "active"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "--"}
                  </Text>

                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 6 }}>
                      Edit user
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <TextInput
                        placeholder="First name"
                        placeholderTextColor={theme.textSecondary}
                        value={editDrafts[user.id]?.firstName ?? user.firstName ?? ""}
                        onChangeText={(value) => handleEditChange(user.id, "firstName", value)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 8,
                          fontSize: 11,
                          color: theme.text,
                        }}
                      />
                      <TextInput
                        placeholder="Last name"
                        placeholderTextColor={theme.textSecondary}
                        value={editDrafts[user.id]?.lastName ?? user.lastName ?? ""}
                        onChangeText={(value) => handleEditChange(user.id, "lastName", value)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 8,
                          fontSize: 11,
                          color: theme.text,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <TextInput
                        placeholder="Email"
                        placeholderTextColor={theme.textSecondary}
                        value={editDrafts[user.id]?.email ?? user.email ?? ""}
                        onChangeText={(value) => handleEditChange(user.id, "email", value)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 8,
                          fontSize: 11,
                          color: theme.text,
                        }}
                      />
                      <TextInput
                        placeholder="Phone"
                        placeholderTextColor={theme.textSecondary}
                        value={editDrafts[user.id]?.phone ?? user.phone ?? ""}
                        onChangeText={(value) => handleEditChange(user.id, "phone", value)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 8,
                          fontSize: 11,
                          color: theme.text,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          overflow: "hidden",
                        }}
                      >
                        <Picker
                          selectedValue={(editDrafts[user.id]?.role ?? user.role ?? "").toUpperCase()}
                          onValueChange={(value) => handleEditChange(user.id, "role", value)}
                          style={{ color: theme.text, height: 36 }}
                          dropdownIconColor={theme.text}
                        >
                          {editableRoles.map((role) => (
                            <Picker.Item key={role} label={role} value={role} />
                          ))}
                        </Picker>
                      </View>
                      <TextInput
                        placeholder="Status"
                        placeholderTextColor={theme.textSecondary}
                        value={editDrafts[user.id]?.status ?? user.status ?? "active"}
                        onChangeText={(value) => handleEditChange(user.id, "status", value)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 8,
                          fontSize: 11,
                          color: theme.text,
                        }}
                      />
                    </View>
                    <TextInput
                      placeholder="Reset password (optional)"
                      placeholderTextColor={theme.textSecondary}
                      value={editDrafts[user.id]?.password ?? ""}
                      onChangeText={(value) => handleEditChange(user.id, "password", value)}
                      secureTextEntry
                      style={{
                        height: 36,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                        paddingHorizontal: 8,
                        fontSize: 11,
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    />
                    <TouchableOpacity
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: theme.primary,
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                      }}
                      onPress={() => handleSaveUser(user)}
                    >
                      <Text style={{ fontSize: 11, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                        Save Changes
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </MotiView>
          ))}
        </View>

        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
          }}
          onPress={() => {
            const headers = [
              "First Name",
              "Last Name",
              "Email",
              "Phone",
              "Role",
              "Location",
              "License Number",
              "Verified",
              "Subscription Active",
              "Status",
              "Registered At",
              "Verified At",
              "Blocked At",
            ];
            const rows = filteredUsers.map((user) => [
              user.firstName,
              user.lastName,
              user.email,
              user.phone,
              user.role,
              user.location || "",
              user.licenseNumber || "",
              user.verified ? "Yes" : "No",
              user.subscriptionActive ? "Active" : "Inactive",
              user.status || "active",
              user.createdAt || "",
              user.verifiedAt || "",
              user.blockedAt || "",
            ]);
            shareCsv({
              filename: "users-export.csv",
              headers,
              rows,
              dialogTitle: "Share Users CSV",
            }).then(({ csv, shared }) => {
              if (!shared) {
                console.log(csv);
                showToast("CSV generated and downloaded.", "info");
              } else {
                showToast("CSV ready to share.", "success");
              }
            });
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            Export Users CSV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 10,
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => {
            const headers = [
              "First Name",
              "Last Name",
              "Email",
              "Phone",
              "Role",
              "Location",
              "License Number",
              "Verified",
              "Subscription Active",
              "Status",
              "Verified At",
              "Blocked At",
            ];
            const rows = filteredUsers.map((user) => [
              user.firstName,
              user.lastName,
              user.email,
              user.phone,
              user.role,
              user.location || "",
              user.licenseNumber || "",
              user.verified ? "Yes" : "No",
              user.subscriptionActive ? "Active" : "Inactive",
              user.status || "active",
              user.verifiedAt || "",
              user.blockedAt || "",
            ]);
            emailCsv({
              filename: "users-export.csv",
              headers,
              rows,
              subject: "Users Export",
              body: "Please find the users CSV attached.",
            }).then(({ csv, emailed }) => {
              if (!emailed) {
                console.log(csv);
                showToast("CSV generated in console output.", "info");
              } else {
                showToast("Email draft opened with CSV attached.", "success");
              }
            });
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Email Users CSV
          </Text>
        </TouchableOpacity>
        {/* Video Call Overlay moved to RootLayout for global access */}
      </ScrollView>
    </ScreenLayout>
  );
}
