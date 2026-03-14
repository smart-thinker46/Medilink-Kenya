import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [dismissedSignatures, setDismissedSignatures] = useState(new Set());
  const dismissKey = auth?.user?.id
    ? `medilink:dismissedNotifications:${auth.user.id}`
    : null;
  const dismissSigKey = auth?.user?.id
    ? `medilink:dismissedNotificationSignatures:${auth.user.id}`
    : null;

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.getNotifications(),
    enabled: Boolean(auth?.token),
  });

  const parseNotificationData = (raw) => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  };

  const buildSignature = (notification) => {
    const data = parseNotificationData(notification?.data) || {};
    const type = String(notification?.type || "").toUpperCase();
    const related =
      String(
        notification?.relatedId ||
          data?.appointmentId ||
          data?.requestId ||
          data?.sessionId ||
          "",
      ).trim() || "none";
    const title = String(notification?.title || "").trim();
    const message = String(notification?.message || "").trim();
    return `${type}|${related}|${title}|${message}`;
  };

  const rawNotifications = notificationsQuery.data || [];
  const notifications = useMemo(() => {
    const list = Array.isArray(rawNotifications)
      ? rawNotifications
      : rawNotifications?.items || [];
    const filtered = list.filter((item) => {
      if (dismissedIds.has(item.id)) return false;
      const signature = buildSignature(item);
      if (dismissedSignatures.has(signature)) return false;
      return true;
    });
    const seen = new Set();
    const deduped = [];
    filtered.forEach((item) => {
      const signature = buildSignature(item);
      if (seen.has(signature)) return;
      seen.add(signature);
      deduped.push(item);
    });
    return deduped;
  }, [rawNotifications, dismissedIds, dismissedSignatures]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const markReadMutation = useMutation({
    mutationFn: (id) => apiClient.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markRead = (id) => markReadMutation.mutate(id);

  const dismissNotification = async (notification) => {
    if (!notification || !notification.id) return;
    const signature = buildSignature(notification);
    const nextIds = new Set(dismissedIds);
    nextIds.add(notification.id);
    setDismissedIds(nextIds);
    if (dismissKey) {
      await AsyncStorage.setItem(dismissKey, JSON.stringify(Array.from(nextIds)));
    }
    if (signature) {
      const nextSignatures = new Set(dismissedSignatures);
      nextSignatures.add(signature);
      setDismissedSignatures(nextSignatures);
      if (dismissSigKey) {
        await AsyncStorage.setItem(
          dismissSigKey,
          JSON.stringify(Array.from(nextSignatures)),
        );
      }
    }
    queryClient.setQueryData(["notifications"], (current = []) => {
      const list = Array.isArray(current) ? current : current?.items || [];
      return list.filter((item) => item.id !== notification.id);
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadDismissed = async () => {
      if (!dismissKey || !dismissSigKey) return;
      try {
        const rawIds = await AsyncStorage.getItem(dismissKey);
        const rawSigs = await AsyncStorage.getItem(dismissSigKey);
        if (!mounted) return;
        if (rawIds) {
          const parsed = JSON.parse(rawIds);
          setDismissedIds(new Set(Array.isArray(parsed) ? parsed : []));
        } else {
          setDismissedIds(new Set());
        }
        if (rawSigs) {
          const parsed = JSON.parse(rawSigs);
          setDismissedSignatures(new Set(Array.isArray(parsed) ? parsed : []));
        } else {
          setDismissedSignatures(new Set());
        }
      } catch {
        if (mounted) {
          setDismissedIds(new Set());
          setDismissedSignatures(new Set());
        }
      }
    };
    loadDismissed();
    return () => {
      mounted = false;
    };
  }, [dismissKey, dismissSigKey]);

  useEffect(() => {
    if (!auth?.token || !auth?.user?.id) return;

    const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";
    const baseUrl = rawBaseUrl.replace(/\/api\/?$/i, "");
    if (!baseUrl) return;
    const socket = io(baseUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("register", { userId: auth.user.id });
    });

    socket.on("notification", (payload) => {
      const titleText = payload?.title?.toLowerCase?.() || "";
      if (titleText.includes("account blocked")) {
        const currentAuth = useAuthStore.getState().auth;
        if (currentAuth?.user) {
          useAuthStore.getState().setAuth({
            ...currentAuth,
            user: { ...currentAuth.user, status: "suspended", blocked: true },
          });
        }
      }
      if (titleText.includes("account unblocked")) {
        const currentAuth = useAuthStore.getState().auth;
        if (currentAuth?.user) {
          useAuthStore.getState().setAuth({
            ...currentAuth,
            user: { ...currentAuth.user, status: "active", blocked: false },
          });
        }
      }
      queryClient.setQueryData(["notifications"], (current = []) => {
        const list = Array.isArray(current) ? current : current?.items || [];
        const notificationData = payload?.data || null;
        const newItem = {
          id: `${Date.now()}`,
          title: payload?.title || "Notification",
          message: payload?.message || "",
          type: payload?.type || "INFO",
          data: notificationData,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        const signature = buildSignature(newItem);
        const existing = list.some((item) => buildSignature(item) === signature);
        if (existing) return list;
        return [newItem, ...list];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.token, auth?.user?.id, queryClient]);

  return {
    notifications,
    unreadCount,
    notificationsQuery,
    markRead,
    dismissNotification,
  };
};
