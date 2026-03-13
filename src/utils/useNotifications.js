import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import io from "socket.io-client";

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.getNotifications(),
    enabled: Boolean(auth?.token),
  });

  const notifications = notificationsQuery.data || [];
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
        return [newItem, ...current];
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
  };
};
