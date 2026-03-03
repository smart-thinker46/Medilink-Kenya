import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { useAuthStore } from "@/utils/auth/store";

const ONLINE_USERS_QUERY_KEY = ["online-users"];

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id.length > 0 ? id : null;
};

const parseIdList = (payload) => {
  if (!payload) return [];

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.userIds)
      ? payload.userIds
      : Array.isArray(payload.users)
        ? payload.users
        : [];

  return list
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return normalizeId(entry);
      }
      return normalizeId(entry?.id || entry?.userId || entry?._id);
    })
    .filter(Boolean);
};

const parseSingleUserStatus = (payload) => {
  if (!payload) return null;

  const userId = normalizeId(
    payload.userId || payload.id || payload._id || payload.participant_id,
  );
  if (!userId) return null;

  if (typeof payload.isOnline === "boolean") {
    return { userId, isOnline: payload.isOnline };
  }

  if (payload.status === "online") return { userId, isOnline: true };
  if (payload.status === "offline") return { userId, isOnline: false };

  return null;
};

export const useOnlineUsers = () => {
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const currentUserId = normalizeId(auth?.user?.id);

  const onlineUsersQuery = useQuery({
    queryKey: ONLINE_USERS_QUERY_KEY,
    queryFn: () => [],
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (!auth?.token || !currentUserId) return;
    const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";
    if (!baseUrl) return;

    const socket = io(baseUrl, { transports: ["websocket"] });

    const setAllOnline = (ids) => {
      queryClient.setQueryData(ONLINE_USERS_QUERY_KEY, Array.from(new Set(ids)));
    };

    const setOneOnline = (userId, isOnline) => {
      queryClient.setQueryData(ONLINE_USERS_QUERY_KEY, (current = []) => {
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return Array.from(next);
      });
    };

    const handleOnlineList = (payload) => {
      const ids = parseIdList(payload);
      if (ids.length > 0) {
        setAllOnline(ids);
      }
    };

    const handleUserOnline = (payload) => {
      const normalized = parseSingleUserStatus(payload) || {
        userId: normalizeId(payload?.userId || payload?.id || payload),
        isOnline: true,
      };
      if (normalized?.userId) {
        setOneOnline(normalized.userId, true);
      }
    };

    const handleUserOffline = (payload) => {
      const normalized = parseSingleUserStatus(payload) || {
        userId: normalizeId(payload?.userId || payload?.id || payload),
        isOnline: false,
      };
      if (normalized?.userId) {
        setOneOnline(normalized.userId, false);
      }
    };

    const handlePresenceUpdate = (payload) => {
      const parsed = parseSingleUserStatus(payload);
      if (parsed?.userId) {
        setOneOnline(parsed.userId, parsed.isOnline);
      }
    };

    socket.on("connect", () => {
      socket.emit("register", { userId: currentUserId });
      socket.emit("get_online_users");
      socket.emit("presence:sync");
    });

    socket.on("online_users", handleOnlineList);
    socket.on("users_online", handleOnlineList);
    socket.on("presence_snapshot", handleOnlineList);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("presence_update", handlePresenceUpdate);

    return () => {
      socket.off("online_users", handleOnlineList);
      socket.off("users_online", handleOnlineList);
      socket.off("presence_snapshot", handleOnlineList);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("presence_update", handlePresenceUpdate);
      socket.disconnect();
    };
  }, [auth?.token, currentUserId, queryClient]);

  const onlineUsers = onlineUsersQuery.data || [];
  const onlineSet = useMemo(() => new Set(onlineUsers.map(normalizeId)), [onlineUsers]);

  const isUserOnline = (user) => {
    if (!user) return false;
    const id = normalizeId(
      user.id ||
      user.userId ||
      user._id ||
      user.patientId ||
      user.medicId ||
      user.participant_id,
    );
    if (!id) return false;

    // If this is the authenticated user in the active session, show online.
    // Presence broadcasts may be unavailable in some backend deployments.
    if (currentUserId && id === currentUserId && auth?.token) return true;

    if (typeof user.isOnline === "boolean") return user.isOnline;
    if (typeof user.online === "boolean") return user.online;
    if (typeof user.is_online === "boolean") return user.is_online;
    if (typeof user.status === "string") {
      if (user.status.toLowerCase() === "online") return true;
      if (user.status.toLowerCase() === "offline") return false;
    }
    return onlineSet.has(id);
  };

  return {
    onlineUsers,
    isUserOnline,
  };
};
