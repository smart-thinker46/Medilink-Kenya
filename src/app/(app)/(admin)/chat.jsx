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
import { ArrowLeft, Send, X } from "lucide-react-native";
import { Check, CheckCheck } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { useChatSocket } from "@/utils/useChatSocket";
import { enqueueMessage } from "@/utils/messageQueue";
import { useI18n } from "@/utils/i18n";
import { canContact, normalizeRole } from "@/utils/communicationRules";

export default function AdminChatScreen() {
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
  const recipientId =
    pickParam("medicId", "userId", "patientId", "participantId", "participant_id", "recipientId");
  const currentUserId = auth?.user?.id;
  const recipientQuery = useQuery({
    queryKey: ["chat-recipient", recipientId],
    queryFn: () => apiClient.getUserById(recipientId),
    enabled: Boolean(recipientId),
  });
  const recipientName = recipientQuery.data?.fullName || recipientQuery.data?.email;
  const senderRole = normalizeRole(auth?.user?.role);
  const recipientRole = normalizeRole(recipientQuery.data?.role);
  const isChatAllowed = recipientRole ? canContact(senderRole, recipientRole) : true;

  const [message, setMessage] = useState("");
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
      sendMutation.mutate({ recipientId, text: outgoingText }, {
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
      });
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
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Chat {recipientId ? `#${recipientId}` : ""}
          </Text>
        </View>

        {threadQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              const bubbleColor = isMine ? theme.primary : theme.surface;
              const textColor = isMine ? "#fff" : theme.text;
              const status = item._localStatus;
              const isFailed = status === "failed";

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => openMessageActions(item)}
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: bubbleColor,
                      padding: 10,
                      borderRadius: 14,
                      maxWidth: "80%",
                      borderWidth: isMine ? 0 : 1,
                      borderColor: theme.border,
                    }}
                  >
                    {(() => {
                      const parsed = parseQuotedMessage(item.text);
                      return parsed.quoted ? (
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
                      ) : null;
                    })()}
                    <Text style={{ color: textColor, fontSize: 13 }}>
                      {parseQuotedMessage(item.text).body}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.textSecondary,
                        marginRight: 6,
                      }}
                    >
                      {formatSeenDate(item.createdAt)}
                    </Text>
                    {isMine && (
                      <>
                        {(item.readAt || item._localStatus === "delivered") ? (
                          <CheckCheck color={theme.success} size={12} />
                        ) : (
                          <Check color={theme.textSecondary} size={12} />
                        )}
                      </>
                    )}
                  </View>
                  {isFailed && (
                    <TouchableOpacity onPress={() => retrySend(item)} style={{ marginTop: 2 }}>
                      <Text style={{ fontSize: 10, color: theme.error }}>
                        Failed. Tap to retry.
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  No messages yet. Start a conversation.
                </Text>
              </View>
            )}
          />
        )}

        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {replyTo ? (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: -54,
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
            <TextInput
              placeholder={
                isChatAllowed
                  ? "Type a message"
                  : "Chat not allowed for this user"
              }
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              style={{
                flex: 1,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.text,
                fontSize: 13,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              editable={isChatAllowed}
            />
            <TouchableOpacity
              style={{
                marginLeft: 10,
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 10,
                opacity: message.trim() ? 1 : 0.6,
              }}
              onPress={handleSend}
              disabled={!message.trim() || !isChatAllowed}
            >
              <Send color="#fff" size={16} />
            </TouchableOpacity>
          </View>
          {queuedCount > 0 && (
            <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6 }}>
              {queuedCount} message(s) queued
            </Text>
          )}
          {recipientName && (
            <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6 }}>
              Chatting with {recipientName}
            </Text>
          )}
        </View>
      </View>
    </ScreenLayout>
  );
}
