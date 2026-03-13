import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Send, Check, CheckCheck, X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as Speech from "expo-speech";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { useChatSocket } from "@/utils/useChatSocket";
import { enqueueMessage } from "@/utils/messageQueue";
import { useI18n } from "@/utils/i18n";
import { canContact, normalizeRole } from "@/utils/communicationRules";
import UserAvatar from "@/components/UserAvatar";

export default function HospitalChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const { formatDateTime } = useI18n();
  const params = useLocalSearchParams();
  const pickParam = (...keys) => {
    for (const key of keys) {
      const value = params?.[key];
      if (Array.isArray(value)) {
        const first = value[0];
        if (first) return String(first);
      } else if (value) {
        return String(value);
      }
    }
    return "";
  };
  const recipientId = pickParam(
    "userId",
    "medicId",
    "patientId",
    "participantId",
    "participant_id",
    "recipientId",
  );
  const currentUserId = auth?.user?.id;
  const recipientQuery = useQuery({
    queryKey: ["chat-recipient", recipientId],
    queryFn: () => apiClient.getUserById(recipientId),
    enabled: Boolean(recipientId),
  });
  const recipient = recipientQuery.data || {};
  const recipientName = recipient.fullName || recipient.email || "User";
  const senderRole = normalizeRole(auth?.user?.role);
  const recipientRole = normalizeRole(recipient?.role);
  const isChatAllowed = recipientRole ? canContact(senderRole, recipientRole) : true;

  const [message, setMessage] = useState("");
  const [sttLanguage, setSttLanguage] = useState("auto");
  const [translateTranscript, setTranslateTranscript] = useState(false);
  const [translateTargetLanguage, setTranslateTargetLanguage] = useState("en");
  const [replyTo, setReplyTo] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState({});
  const queryClient = useQueryClient();
  const { isConnected, queuedCount, setQueuedCount } = useChatSocket(recipientId);
  const threadQuery = useQuery({
    queryKey: ["chat-thread", recipientId],
    queryFn: () => apiClient.getChatThread(recipientId),
    enabled: Boolean(recipientId),
  });
  const messages = useMemo(() => threadQuery.data || [], [threadQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (payload) => apiClient.sendChatMessage(payload),
    onMutate: async (payload) => {
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["chat-thread", recipientId], (current = []) => [
        ...current,
        {
          id: tempId,
          senderId: currentUserId,
          recipientId,
          text: payload.text,
          createdAt: new Date().toISOString(),
          readAt: null,
          _localStatus: "sending",
        },
      ]);
      return { tempId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-thread", recipientId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return null;
      const asset = Array.isArray(picked.assets) ? picked.assets[0] : null;
      if (!asset?.uri) {
        throw new Error("No audio file selected.");
      }
      return apiClient.aiVoiceStt({
        uri: asset.uri,
        name: asset.name || "voice.wav",
        type: asset.mimeType || "audio/wav",
        language: sttLanguage.trim().toLowerCase() === "auto" ? "" : sttLanguage.trim(),
        translate: translateTranscript,
        targetLanguage: translateTargetLanguage.trim().toLowerCase() || "en",
      });
    },
    onSuccess: (data) => {
      if (!data) return;
      const transcript = String(data?.text || "").trim();
      if (!transcript) {
        showToast("No transcript returned.", "warning");
        return;
      }
      setMessage((current) => (current ? `${current} ${transcript}` : transcript));
      showToast(
        translateTranscript
          ? `Audio translated to ${translateTargetLanguage.trim() || "en"}.`
          : `Audio transcribed (${String(data?.language || sttLanguage || "auto")}).`,
        "success",
      );
      if (translateTranscript) {
        Speech.stop().catch(() => undefined);
        Speech.speak(transcript, {
          language: resolveSpeechLanguage(),
          rate: 0.95,
          pitch: 1.0,
        });
      }
    },
    onError: (error) => {
      showToast(error?.message || "Audio transcription failed.", "error");
    },
  });

  const resolveSpeechLanguage = () => {
    const code = String(translateTargetLanguage || "").trim().toLowerCase();
    if (!code) return undefined;
    const map = {
      en: "en-US",
      sw: "sw-KE",
      fr: "fr-FR",
      ar: "ar-SA",
      es: "es-ES",
      de: "de-DE",
      pt: "pt-PT",
      hi: "hi-IN",
      zh: "zh-CN",
    };
    return map[code] || code;
  };

  const readMessageMutation = useMutation({
    mutationFn: async (text) => {
      const cleanText = String(text || "").trim();
      if (!cleanText) throw new Error("Message is empty.");
      await Speech.stop();
      Speech.speak(cleanText, {
        language: resolveSpeechLanguage(),
        rate: 0.95,
        pitch: 1.0,
      });
      return true;
    },
    onSuccess: () => {
      showToast("Reading message aloud.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Unable to read message aloud.", "error");
    },
  });

  const parseQuotedMessage = (rawText) => {
    const text = String(rawText || "");
    const match = text.match(/^> ([^:]+): (.*)\n([\s\S]*)$/);
    if (!match) return { quoted: null, body: text };
    return {
      quoted: { author: match[1], text: match[2] },
      body: match[3],
    };
  };

  const buildOutgoingText = (plainText) => {
    const body = String(plainText || "").trim();
    if (!replyTo) return body;
    const sourceText = String(replyTo.text || "").replace(/\s+/g, " ").trim();
    const snippet = sourceText.length > 80 ? `${sourceText.slice(0, 80)}...` : sourceText;
    const author = replyTo.senderId === currentUserId ? "You" : (recipientName || "User");
    return `> ${author}: ${snippet}\n${body}`;
  };

  const visibleMessages = useMemo(
    () => messages.filter((item) => !hiddenMessageIds[item.id]),
    [messages, hiddenMessageIds],
  );

  const handleCopyMessage = async (item) => {
    try {
      await Clipboard.setStringAsync(parseQuotedMessage(item.text).body);
      showToast("Message copied.", "success");
    } catch {
      showToast("Unable to copy message.", "error");
    }
  };

  const handleReadMessageAloud = (item) => {
    const content = parseQuotedMessage(item?.text).body;
    if (!content) {
      showToast("Message is empty.", "warning");
      return;
    }
    readMessageMutation.mutate(content);
  };

  const handleDeleteForMe = async (item) => {
    try {
      await apiClient.deleteChatMessage(item.id);
      setHiddenMessageIds((current) => ({ ...current, [item.id]: true }));
      if (replyTo?.id === item.id) {
        setReplyTo(null);
      }
      queryClient.invalidateQueries({ queryKey: ["chat-thread", recipientId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch {
      showToast("Failed to delete message.", "error");
    }
  };

  const handleDeleteForEveryone = async (item) => {
    try {
      await apiClient.deleteChatMessageForEveryone(item.id);
      setHiddenMessageIds((current) => ({ ...current, [item.id]: true }));
      if (replyTo?.id === item.id) {
        setReplyTo(null);
      }
      queryClient.invalidateQueries({ queryKey: ["chat-thread", recipientId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch {
      showToast("Failed to delete for everyone.", "error");
    }
  };

  const openMessageActions = (item) => {
    const actions = [
      { text: "Reply", onPress: () => setReplyTo(item) },
      { text: "Copy", onPress: () => handleCopyMessage(item) },
      { text: "Read aloud", onPress: () => handleReadMessageAloud(item) },
      {
        text: "Delete for me",
        style: "destructive",
        onPress: () => handleDeleteForMe(item),
      },
    ];

    if (item.senderId === currentUserId) {
      actions.push({
        text: "Delete for everyone",
        style: "destructive",
        onPress: () => handleDeleteForEveryone(item),
      });
    }

    actions.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message actions", "Choose an action", actions);
  };

  const handleSend = () => {
    if (!message.trim() || !recipientId) return;
    if (!isChatAllowed) {
      showToast("You are not allowed to chat with this user.", "error");
      return;
    }
    const outgoingText = buildOutgoingText(message.trim());
    if (!isConnected) {
      const tempId = `queued-${Date.now()}`;
      enqueueMessage(currentUserId, {
        tempId,
        recipientId,
        text: outgoingText,
      });
      setQueuedCount((count) => count + 1);
      queryClient.setQueryData(["chat-thread", recipientId], (current = []) => [
        ...current,
        {
          id: tempId,
          senderId: currentUserId,
          recipientId,
          text: outgoingText,
          createdAt: new Date().toISOString(),
          readAt: null,
          _localStatus: "queued",
        },
      ]);
      showToast("Message queued. Will send when online.", "warning");
    } else {
      sendMutation.mutate(
        { recipientId, text: outgoingText },
        {
          onSuccess: (data, variables, context) => {
            if (context?.tempId) {
              queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
                current.map((msg) => (msg.id === context.tempId ? data : msg)),
              );
            }
          },
          onError: (_error, _variables, context) => {
            if (context?.tempId) {
              queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
                current.map((msg) =>
                  msg.id === context.tempId ? { ...msg, _localStatus: "failed" } : msg,
                ),
              );
            }
            showToast("Message failed. Tap to retry.", "error");
          },
        },
      );
    }
    setMessage("");
    setReplyTo(null);
  };

  const retrySend = (failedMessage) => {
    queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
      current.filter((msg) => msg.id !== failedMessage.id),
    );
    if (!isConnected) {
      const tempId = `queued-${Date.now()}`;
      enqueueMessage(currentUserId, {
        tempId,
        recipientId,
        text: failedMessage.text,
      });
      setQueuedCount((count) => count + 1);
      queryClient.setQueryData(["chat-thread", recipientId], (current = []) => [
        ...current,
        {
          id: tempId,
          senderId: currentUserId,
          recipientId,
          text: failedMessage.text,
          createdAt: new Date().toISOString(),
          readAt: null,
          _localStatus: "queued",
        },
      ]);
      showToast("Message queued. Will send when online.", "warning");
    } else {
      sendMutation.mutate({ recipientId, text: failedMessage.text });
    }
  };

  const formatSeenDate = (dateString) => formatDateTime(dateString);

  useEffect(() => {
    if (recipientId) {
      apiClient
        .markChatRead(recipientId)
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
        )
        .catch(() => {});
    }
  }, [recipientId, queryClient]);

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <UserAvatar
              user={recipient}
              size={40}
              backgroundColor={theme.surface}
              borderColor={theme.border}
              textColor={theme.textSecondary}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                }}
              >
                {recipientName}
              </Text>
              {recipientRole ? (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {recipientRole.replace(/_/g, " ")}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => transcribeMutation.mutate()}
            disabled={!isChatAllowed || transcribeMutation.isLoading}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              opacity: !isChatAllowed ? 0.6 : 1,
            }}
          >
            {transcribeMutation.isLoading ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Text style={{ fontSize: 11, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Transcribe Audio
              </Text>
            )}
          </TouchableOpacity>
          <TextInput
            value={sttLanguage}
            onChangeText={setSttLanguage}
            placeholder="auto"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            style={{
              marginLeft: 8,
              width: 90,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              backgroundColor: theme.surface,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              fontSize: 11,
            }}
          />
          <TouchableOpacity
            onPress={() => setTranslateTranscript((current) => !current)}
            style={{
              marginLeft: 8,
              borderWidth: 1,
              borderColor: translateTranscript ? theme.success : theme.border,
              borderRadius: 10,
              backgroundColor: translateTranscript ? `${theme.success}22` : theme.surface,
              paddingHorizontal: 8,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 10, color: theme.text }}>
              {translateTranscript ? "Translate: ON" : "Translate: OFF"}
            </Text>
          </TouchableOpacity>
          {translateTranscript ? (
            <TextInput
              value={translateTargetLanguage}
              onChangeText={setTranslateTargetLanguage}
              placeholder="en"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              style={{
                marginLeft: 8,
                width: 60,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                backgroundColor: theme.surface,
                paddingHorizontal: 8,
                paddingVertical: 8,
                color: theme.text,
                fontSize: 11,
              }}
            />
          ) : null}
          <Text style={{ marginLeft: 8, fontSize: 10, color: theme.textSecondary }}>
            Lang / To
          </Text>
        </View>

        {threadQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              const parsed = parseQuotedMessage(item.text);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => openMessageActions(item)}
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    backgroundColor: isMine ? theme.primary : theme.surface,
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 10,
                    maxWidth: "80%",
                  }}
                >
                  {isMine && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_400Regular" }}>
                        {item.readAt
                          ? `Seen by ${recipientName || "user"} at ${formatSeenDate(item.readAt)}`
                          : item.deliveredAt
                            ? `Delivered at ${formatSeenDate(item.deliveredAt)}`
                            : item._localStatus === "sending"
                              ? "Sending..."
                              : item._localStatus === "queued"
                                ? "Queued"
                                : "Sent"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        {item.readAt ? (
                          <CheckCheck color="#FFFFFF" size={12} />
                        ) : (
                          <Check color="#FFFFFF" size={12} />
                        )}
                      </View>
                  </View>
                )}
                  {parsed.quoted ? (
                    <View
                      style={{
                        backgroundColor: isMine ? "rgba(255,255,255,0.22)" : theme.card,
                        borderRadius: 10,
                        padding: 8,
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Inter_600SemiBold",
                          color: isMine ? "#FFFFFF" : theme.primary,
                          marginBottom: 2,
                        }}
                      >
                        {parsed.quoted.author}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Inter_400Regular",
                          color: isMine ? "#FFFFFF" : theme.textSecondary,
                        }}
                        numberOfLines={2}
                      >
                        {parsed.quoted.text}
                      </Text>
                    </View>
                  ) : null}
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: isMine ? "#FFFFFF" : theme.text,
                    }}
                  >
                    {parsed.body}
                  </Text>
                  {isMine && item._localStatus === "failed" && (
                    <TouchableOpacity onPress={() => retrySend(item)} style={{ marginTop: 6 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                        Failed. Tap to retry
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                  }}
                >
                  {recipientId
                    ? "No messages yet. Say hi!"
                    : "Select a user to start chatting."}
                </Text>
              </View>
            )}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            borderRadius: 16,
            marginHorizontal: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {replyTo ? (
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: -58,
                backgroundColor: theme.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
                  Replying to {replyTo.senderId === currentUserId ? "yourself" : (recipientName || "user")}
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <X size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text
                style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}
                numberOfLines={2}
              >
                {parseQuotedMessage(replyTo.text).body}
              </Text>
            </View>
          ) : null}
          {queuedCount > 0 && (
            <View
              style={{
                backgroundColor: theme.warning,
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 10, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                {queuedCount}
              </Text>
            </View>
          )}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            style={{
              flex: 1,
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.text,
            }}
          />
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.primary,
              justifyContent: "center",
              alignItems: "center",
              opacity: message.trim() && recipientId ? 1 : 0.6,
            }}
            onPress={handleSend}
            disabled={!message.trim() || !recipientId || sendMutation.isLoading}
          >
            <Send color="#FFFFFF" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
