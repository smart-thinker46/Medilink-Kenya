import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";

export const useChatUnreadCount = () => {
  const { auth } = useAuthStore();

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => apiClient.getChatConversations(),
    enabled: Boolean(auth?.token),
  });

  const unreadCount = useMemo(() => {
    const items = conversationsQuery.data || [];
    return items.reduce((sum, item) => sum + (item?.unreadCount || 0), 0);
  }, [conversationsQuery.data]);

  return {
    unreadCount,
    conversationsQuery,
  };
};
