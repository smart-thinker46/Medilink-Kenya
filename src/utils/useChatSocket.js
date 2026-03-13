import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { getQueuedMessages, removeQueuedMessage, getQueuedCount } from "@/utils/messageQueue";

export const useChatSocket = (recipientId) => {
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    if (!auth?.token || !auth?.user?.id) return;
    const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";
    const baseUrl = rawBaseUrl.replace(/\/api\/?$/i, "");
    if (!baseUrl) return;
    let mounted = true;

    const socket = io(baseUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("register", { userId: auth.user.id });
      if (!mounted) return;
      setIsConnected(true);
      getQueuedCount(auth.user.id).then((count) => {
        if (mounted) setQueuedCount(count);
      });
      // Flush queued messages
      getQueuedMessages(auth.user.id).then(async (queue) => {
        for (const item of queue) {
          if (!mounted) break;
          try {
            await apiClient.sendChatMessage({
              recipientId: item.recipientId,
              text: item.text,
            });
            await removeQueuedMessage(auth.user.id, item.tempId);
          } catch {
            // keep in queue
          }
        }
        if (!mounted) return;
        getQueuedCount(auth.user.id).then((count) => {
          if (mounted) setQueuedCount(count);
        });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        if (recipientId) {
          queryClient.invalidateQueries({ queryKey: ["chat-thread", recipientId] });
        }
      }).catch(() => undefined);
    });

    socket.on("disconnect", () => {
      if (mounted) {
        setIsConnected(false);
      }
    });

    socket.on("chat_message", (payload) => {
      if (!payload?.id) return;

      if (recipientId) {
        const matchesThread =
          (payload.senderId === auth.user.id && payload.recipientId === recipientId) ||
          (payload.senderId === recipientId && payload.recipientId === auth.user.id);

        if (matchesThread) {
          queryClient.setQueryData(["chat-thread", recipientId], (current = []) => {
            const exists = current.some((message) => message.id === payload.id);
            if (exists) return current;
            return [...current, payload];
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    });

    socket.on("chat_delivered", (payload) => {
      if (!payload?.messageId) return;
      if (recipientId) {
        queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
          current.map((message) =>
            message.id === payload.messageId
              ? { ...message, deliveredAt: payload.deliveredAt }
              : message,
          ),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    });

    socket.on("chat_read", (payload) => {
      if (!payload?.readerId) return;
      if (recipientId && payload.readerId === recipientId) {
        queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
          current.map((message) => {
            if (
              message.senderId === auth.user.id &&
              message.recipientId === recipientId
            ) {
              return { ...message, readAt: message.readAt || new Date().toISOString() };
            }
            return message;
          }),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    });

    socket.on("chat_deleted", (payload) => {
      if (!payload?.messageId) return;
      if (recipientId) {
        const matchesThread =
          (payload.senderId === auth.user.id && payload.recipientId === recipientId) ||
          (payload.senderId === recipientId && payload.recipientId === auth.user.id);
        if (matchesThread) {
          queryClient.setQueryData(["chat-thread", recipientId], (current = []) =>
            current.filter((message) => message.id !== payload.messageId),
          );
        }
      }
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, [auth?.token, auth?.user?.id, queryClient, recipientId]);

  return { isConnected, queuedCount, setQueuedCount };
};
