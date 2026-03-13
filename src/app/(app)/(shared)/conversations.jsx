import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MessageCircle, ArrowLeft, Search, Sparkles } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import UserAvatar from "@/components/UserAvatar";

export default function ConversationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const { formatDateTime } = useI18n();
  const { isUserOnline } = useOnlineUsers();
  const role = auth?.user?.role?.toUpperCase?.() || auth?.user?.role;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [aiResults, setAiResults] = useState([]);

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => apiClient.getChatConversations(),
  });
  const aiSearchMutation = useMutation({
    mutationFn: () =>
      apiClient.aiSearch({
        query: searchQuery,
        limit: 8,
      }),
    onSuccess: (data) => {
      setAiResults(Array.isArray(data?.results) ? data.results : []);
    },
    onError: (error) => {
      showToast(error.message || "AI search unavailable.", "error");
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      conversationsQuery.refetch();
      return () => {};
    }, [conversationsQuery]),
  );

  const filters = [
    { id: "ALL", label: "All" },
    { id: "PATIENT", label: "Patients" },
    { id: "MEDIC", label: "Medics" },
    { id: "HOSPITAL_ADMIN", label: "Hospitals" },
    { id: "PHARMACY_ADMIN", label: "Pharmacies" },
  ];

  const filteredConversations = useMemo(() => {
    const items = conversationsQuery.data || [];
    const search = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const user = item.user || {};
      const matchesRole = activeFilter === "ALL" || user.role === activeFilter;
      const matchesSearch =
        !search ||
        (user.fullName || "").toLowerCase().includes(search) ||
        (user.email || "").toLowerCase().includes(search);
      return matchesRole && matchesSearch;
    });
  }, [conversationsQuery.data, searchQuery, activeFilter]);

  const getChatRoute = (userId) => {
    switch (role) {
      case "PATIENT":
        return `/(app)/(patient)/chat?userId=${userId}`;
      case "MEDIC":
        return `/(app)/(medic)/chat?userId=${userId}`;
      case "HOSPITAL_ADMIN":
        return `/(app)/(hospital)/chat?userId=${userId}`;
      case "PHARMACY_ADMIN":
        return `/(app)/(pharmacy)/chat?userId=${userId}`;
      case "SUPER_ADMIN":
        return `/(app)/(admin)/chat?userId=${userId}`;
      default:
        return `/(app)/(patient)/chat?userId=${userId}`;
    }
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 20,
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
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Conversations
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Search color={theme.iconColor} size={18} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email"
              placeholderTextColor={theme.textSecondary}
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.text,
              }}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <FlatList
            data={filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor:
                    activeFilter === item.id ? theme.primary : theme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
                onPress={() => setActiveFilter(item.id)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color:
                      activeFilter === item.id ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => aiSearchMutation.mutate()}
            disabled={!searchQuery.trim() || aiSearchMutation.isLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: !searchQuery.trim() ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Sparkles color={theme.primary} size={16} />
              <Text style={{ fontSize: 13, color: theme.text, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
                AI Find People & Providers
              </Text>
            </View>
            {aiSearchMutation.isLoading ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Text style={{ fontSize: 12, color: theme.primary }}>Run</Text>
            )}
          </TouchableOpacity>
          {aiResults.length > 0 && (
            <View style={{ marginTop: 10, gap: 8 }}>
              {aiResults.map((result) => (
                <TouchableOpacity
                  key={`${result.type}-${result.id}`}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  activeOpacity={0.85}
                  onPress={() => router.push(getChatRoute(result.id))}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {result.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    {(result.type || "").toUpperCase()} {result.subtitle ? `• ${result.subtitle}` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {conversationsQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item?.user?.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const online = isUserOnline(item.user);
              return (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
                onPress={() => router.push(getChatRoute(item.user?.id))}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <UserAvatar
                    user={item.user}
                    size={44}
                    backgroundColor={theme.surface}
                    borderColor={theme.border}
                    textColor={theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {item.user?.fullName || item.user?.email || "User"}
                    </Text>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: online ? "#22C55E" : theme.textSecondary,
                        marginLeft: 8,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                        color: online ? "#22C55E" : theme.textSecondary,
                        marginLeft: 4,
                      }}
                    >
                      {online ? "Online" : "Offline"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.text || "Start a conversation"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                  {item.user?.lastLogin && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                        marginBottom: 6,
                      }}
                    >
                      {new Date(item.user.lastLogin).toLocaleDateString()}
                    </Text>
                  )}
                  {item.lastSeenAt && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                        marginBottom: 6,
                      }}
                    >
                      Seen by {item.user?.fullName || "user"} at{" "}
                      {formatDateTime(item.lastSeenAt)}
                    </Text>
                  )}
                  {item.unreadCount > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.primary,
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                        }}
                      >
                        {item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <MessageCircle color={theme.iconColor} size={32} />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    marginTop: 12,
                  }}
                >
                  No conversations yet
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginTop: 6,
                  }}
                >
                  Start a chat to see it here.
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </ScreenLayout>
  );
}
