import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { Mail, Search, Send, Sparkles, UserRound, Volume2 } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const audienceOptions = [
  { label: "All Users", value: "ALL" },
  { label: "Patients", value: "PATIENT" },
  { label: "Medics", value: "MEDIC" },
  { label: "Hospitals", value: "HOSPITAL_ADMIN" },
  { label: "Pharmacies", value: "PHARMACY_ADMIN" },
  { label: "Single User", value: "USER" },
];

const templateOptions = [
  { id: "welcome", label: "Welcome" },
  { id: "payment-reminder", label: "Payment Reminder" },
  { id: "shift-update", label: "Shift Update" },
];

const getAudienceLabel = (audience) =>
  audienceOptions.find((option) => option.value === audience)?.label || "Users";

const ROLE_LABELS = {
  SUPER_ADMIN: "Admin",
  HOSPITAL_ADMIN: "Hospital Admin",
  PHARMACY_ADMIN: "Pharmacy Admin",
  PATIENT: "Patient",
  MEDIC: "Medic",
};

const formatRoleLabel = (role) => {
  const normalized = String(role || "").trim().toUpperCase();
  if (!normalized) return "User";
  return ROLE_LABELS[normalized] || normalized.replace(/_/g, " ");
};

const buildTemplate = ({ templateId, audience, selectedUser }) => {
  const recipientName =
    selectedUser?.fullName ||
    `${selectedUser?.firstName || ""} ${selectedUser?.lastName || ""}`.trim() ||
    "there";
  const audienceLabel = getAudienceLabel(audience);

  if (templateId === "welcome") {
    return {
      subject: "Welcome to MediLink Kenya",
      message: `Hello ${recipientName},\n\nWelcome to MediLink Kenya. Your account is active and ready for use.\n\nYou can now access appointments, records, messaging, and pharmacy services based on your role.\n\nIf you need assistance, reply to this email or contact support.\n\nRegards,\nMediLink Admin Team`,
    };
  }

  if (templateId === "payment-reminder") {
    return {
      subject: "Subscription Payment Reminder",
      message: `Hello ${recipientName},\n\nThis is a reminder that your subscription payment is due soon.\n\nPlease complete payment in the app to maintain uninterrupted access to premium features.\n\nAudience: ${audienceLabel}\n\nRegards,\nMediLink Billing Team`,
    };
  }

  if (templateId === "shift-update") {
    return {
      subject: "Shift Update Notice",
      message: `Hello ${recipientName},\n\nThere is an update on your shift assignment.\n\nShift: [SHIFT_NAME]\nHospital: [HOSPITAL_NAME]\nDate: [SHIFT_DATE]\nStatus: [APPROVED / CANCELED / UPDATED]\n\nOpen the app to view full details and next steps.\n\nRegards,\nMediLink Operations Team`,
    };
  }

  return { subject: "", message: "" };
};

export default function AdminEmailCenterScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();

  const [audience, setAudience] = useState("ALL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [aiBrief, setAiBrief] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const { speak: speakAiDraft, isSpeaking: aiSpeakingDraft } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "admin-email-center"],
    queryFn: () => apiClient.aiGetSettings(),
  });
  const aiCanUse = Boolean(aiSettingsQuery.data?.canUse);
  const aiBlockedReason = String(aiSettingsQuery.data?.blockedReason || "");

  const searchingUsers = audience === "USER" && recipientSearch.trim().length >= 2;

  const usersQuery = useQuery({
    queryKey: ["admin-email-center-users", recipientSearch],
    queryFn: () =>
      apiClient.getAdminUsers({
        search: recipientSearch.trim(),
        page: 1,
        pageSize: 20,
      }),
    enabled: searchingUsers,
  });

  const usersPayload = usersQuery.data || {};
  const userMatches = useMemo(() => {
    if (Array.isArray(usersPayload)) return usersPayload;
    if (Array.isArray(usersPayload?.items)) return usersPayload.items;
    return [];
  }, [usersPayload]);

  const notificationsQuery = useQuery({
    queryKey: ["admin-email-center-history"],
    queryFn: () => apiClient.adminGetNotifications(),
  });

  const emailHistory = useMemo(() => {
    const rows = Array.isArray(notificationsQuery.data) ? notificationsQuery.data : [];
    return rows.filter((item) => item?.sendEmail).slice(0, 10);
  }, [notificationsQuery.data]);

  const resetForm = () => {
    setSubject("");
    setMessage("");
    setRecipientSearch("");
    setSelectedUser(null);
    setSelectedTemplate("");
  };

  const aiComposeMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.aiAdminEmailsAssistant({
        mode: "compose",
        brief: payload.brief,
        tone: payload.tone,
        audience: payload.audience,
      }),
    onSuccess: (data) => {
      const nextSubject = String(data?.subject || "").trim();
      const nextBody = String(data?.body || "").trim();
      if (nextSubject) {
        setSubject(nextSubject);
      }
      if (nextBody) {
        setMessage(nextBody);
      }
      if (!nextSubject && !nextBody) {
        showToast("AI did not return a draft. Please refine your brief.", "warning");
        return;
      }
      showToast("AI email draft generated.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "AI draft generation failed.", "error");
    },
  });

  const applyTemplate = (templateId) => {
    const template = buildTemplate({
      templateId,
      audience,
      selectedUser,
    });
    setSubject(template.subject);
    setMessage(template.message);
    setSelectedTemplate(templateId);
    showToast("Template applied.", "success");
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      showToast("Enter email subject.", "warning");
      return;
    }
    if (!message.trim()) {
      showToast("Enter email message.", "warning");
      return;
    }
    if (audience === "USER" && !selectedUser?.id) {
      showToast("Select one recipient.", "warning");
      return;
    }

    const payload = {
      title: subject.trim(),
      message: message.trim(),
      audience,
      userId: audience === "USER" ? selectedUser.id : undefined,
      sendEmail: true,
      emailSubject: subject.trim(),
      emailText: message.trim(),
      type: "INFO",
    };

    try {
      setIsSending(true);
      const response = await apiClient.adminSendNotification(payload);
      const sentCount = Number(response?.email?.sent || 0);
      const failedCount = Number(response?.email?.failed || 0);
      const recipients = Number(response?.recipients || 0);
      if (failedCount > 0 && sentCount === 0) {
        showToast(
          response?.email?.errors?.[0] || "Email send failed for selected audience.",
          "error",
        );
      } else {
        showToast(
          sentCount > 0
            ? `Email sent to ${sentCount} recipient(s).`
            : `Notification sent to ${recipients} user(s).`,
          "success",
        );
      }
      resetForm();
      notificationsQuery.refetch();
    } catch (error) {
      showToast(error?.message || "Failed to send email.", "error");
    } finally {
      setIsSending(false);
    }
  };

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Mail color={theme.primary} size={22} />
          <Text
            style={{
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
              marginLeft: 10,
            }}
          >
            Email Center
          </Text>
        </View>
        <Text
          style={{
            fontSize: 13,
            color: theme.textSecondary,
            marginBottom: 14,
            fontFamily: "Inter_400Regular",
          }}
        >
          Send targeted emails to platform users. Emails are sent together with in-app notification.
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {audienceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: audience === option.value ? theme.primary : theme.border,
                backgroundColor: audience === option.value ? `${theme.primary}1A` : theme.card,
              }}
              onPress={() => {
                setAudience(option.value);
                if (option.value !== "USER") {
                  setRecipientSearch("");
                  setSelectedUser(null);
                }
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: audience === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.card,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Sparkles color={theme.primary} size={16} />
            <Text
              style={{
                marginLeft: 8,
                color: theme.text,
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Quick Templates
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {templateOptions.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={{
                  borderWidth: 1,
                  borderColor:
                    selectedTemplate === template.id ? theme.primary : theme.border,
                  backgroundColor:
                    selectedTemplate === template.id
                      ? `${theme.primary}1A`
                      : theme.surface,
                  borderRadius: 10,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                }}
                onPress={() => applyTemplate(template.id)}
              >
                <Text
                  style={{
                    color:
                      selectedTemplate === template.id
                        ? theme.primary
                        : theme.textSecondary,
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {template.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 8 }}>
            Tip: Templates prefill subject and message. Edit before sending.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.card,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Sparkles color={theme.primary} size={16} />
            <Text
              style={{
                marginLeft: 8,
                color: theme.text,
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Medilink AI Draft
            </Text>
          </View>
          <TextInput
            placeholder="Describe the email you want AI to write..."
            placeholderTextColor={theme.textSecondary}
            value={aiBrief}
            onChangeText={setAiBrief}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              minHeight: 84,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              paddingTop: 10,
              color: theme.text,
              marginBottom: 8,
            }}
          />
          <TextInput
            placeholder="Tone (e.g. professional, friendly, urgent)"
            placeholderTextColor={theme.textSecondary}
            value={aiTone}
            onChangeText={setAiTone}
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              marginBottom: 8,
            }}
          />
          {!!aiBlockedReason && (
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 8 }}>
              {aiBlockedReason}
            </Text>
          )}
          <TouchableOpacity
            style={{
              height: 42,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
              opacity:
                !aiCanUse || !aiBrief.trim() || aiComposeMutation.isPending || aiComposeMutation.isLoading
                  ? 0.65
                  : 1,
            }}
            disabled={
              !aiCanUse || !aiBrief.trim() || aiComposeMutation.isPending || aiComposeMutation.isLoading
            }
            onPress={() =>
              aiComposeMutation.mutate({
                brief: aiBrief.trim(),
                tone: aiTone.trim() || "professional",
                audience,
              })
            }
          >
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {aiComposeMutation.isPending || aiComposeMutation.isLoading
                ? "Generating..."
                : "Generate with AI"}
            </Text>
          </TouchableOpacity>
        </View>

        {audience === "USER" && (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.surface,
                paddingHorizontal: 10,
                height: 44,
              }}
            >
              <Search color={theme.iconColor} size={16} />
              <TextInput
                placeholder="Search user by name or email"
                placeholderTextColor={theme.textSecondary}
                value={recipientSearch}
                onChangeText={setRecipientSearch}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: theme.text,
                  fontSize: 13,
                }}
              />
            </View>

            {selectedUser?.id && (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: `${theme.success}1A`,
                  borderColor: theme.success,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  Selected: {selectedUser.fullName || selectedUser.email}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                  {selectedUser.email}
                </Text>
              </View>
            )}

            {searchingUsers && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {usersQuery.isLoading && (
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Searching users...
                  </Text>
                )}
                {!usersQuery.isLoading && userMatches.length === 0 && (
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    No users found for this search.
                  </Text>
                )}
                {userMatches.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        selectedUser?.id === user.id ? theme.primary : theme.border,
                      backgroundColor:
                        selectedUser?.id === user.id
                          ? `${theme.primary}14`
                          : theme.surface,
                      borderRadius: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                    }}
                    onPress={() => {
                      setSelectedUser(user);
                      setRecipientSearch("");
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <UserRound color={theme.iconColor} size={14} />
                      <Text
                        style={{
                          marginLeft: 8,
                          color: theme.text,
                          fontSize: 12,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
                      </Text>
                    </View>
                    <Text
                      style={{
                        marginTop: 2,
                        color: theme.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      {user.email} • {formatRoleLabel(user.role)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <TextInput
          placeholder="Email subject"
          placeholderTextColor={theme.textSecondary}
          value={subject}
          onChangeText={setSubject}
          style={{
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            color: theme.text,
            marginBottom: 12,
          }}
        />

        <TextInput
          placeholder="Write your message"
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            minHeight: 140,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingTop: 12,
            color: theme.text,
            marginBottom: 14,
          }}
        />

        <TouchableOpacity
          style={{
            height: 42,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            marginBottom: 10,
            opacity:
              !aiCanUse || !message.trim() || aiSpeakingDraft
                ? 0.65
                : 1,
          }}
          disabled={!aiCanUse || !message.trim() || aiSpeakingDraft}
          onPress={() => {
            const speechText = [subject?.trim(), message?.trim()].filter(Boolean).join(". ");
            speakAiDraft(speechText);
          }}
        >
          <Volume2 color={theme.text} size={16} />
          <Text
            style={{
              marginLeft: 8,
              color: theme.text,
              fontFamily: "Inter_600SemiBold",
              fontSize: 12,
            }}
          >
            {aiSpeakingDraft
              ? "Reading..."
              : "Read Draft Aloud (AI Speech)"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            height: 46,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            backgroundColor: theme.primary,
            opacity: isSending ? 0.75 : 1,
          }}
          onPress={handleSend}
          disabled={isSending}
        >
          <Send color="#fff" size={16} />
          <Text
            style={{
              marginLeft: 8,
              color: "#fff",
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            {isSending ? "Sending..." : "Send Email"}
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 22 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_700Bold",
              color: theme.text,
              marginBottom: 10,
            }}
          >
            Recent Email Campaigns
          </Text>
          {emailHistory.length === 0 && (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              No recent email campaigns yet.
            </Text>
          )}
          {emailHistory.map((item, index) => (
            <MotiView
              key={item.id || `${item.createdAt}-${index}`}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 240, delay: index * 30 }}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.card,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                {item.title || "Untitled"}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                Audience: {item.audience || "ALL"}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "Unknown date"}
              </Text>
            </MotiView>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
