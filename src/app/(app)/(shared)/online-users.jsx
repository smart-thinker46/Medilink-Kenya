import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Users } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import OnlineStatusChip from "@/components/OnlineStatusChip";
import UserAvatar from "@/components/UserAvatar";

const ROLE_OPTIONS = [
  { label: "All", value: "" },
  { label: "Patients", value: "PATIENT" },
  { label: "Medics", value: "MEDIC" },
  { label: "Hospitals", value: "HOSPITAL_ADMIN" },
  { label: "Pharmacies", value: "PHARMACY_ADMIN" },
];

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

const formatTimestamp = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const formatRelativeTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf =
    typeof Intl !== "undefined" && Intl.RelativeTimeFormat
      ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
      : null;

  if (Math.abs(diffDays) >= 1) {
    return rtf ? rtf.format(diffDays, "day") : `${Math.abs(diffDays)} day(s)`;
  }
  if (Math.abs(diffHours) >= 1) {
    return rtf ? rtf.format(diffHours, "hour") : `${Math.abs(diffHours)} hour(s)`;
  }
  if (Math.abs(diffMinutes) >= 1) {
    return rtf ? rtf.format(diffMinutes, "minute") : `${Math.abs(diffMinutes)} minute(s)`;
  }
  return rtf ? rtf.format(diffSeconds, "second") : `${Math.abs(diffSeconds)} second(s)`;
};

export default function OnlineUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const params = useLocalSearchParams();

  const paramRole = Array.isArray(params?.role) ? params.role[0] : params?.role;
  const [roleFilter, setRoleFilter] = useState(String(paramRole || ""));
  const [search, setSearch] = useState("");

  const onlineQuery = useQuery({
    queryKey: ["online-users", roleFilter, search],
    queryFn: () =>
      apiClient.getOnlineUsers({
        roles: roleFilter || undefined,
        search: search || undefined,
      }),
    refetchInterval: 15000,
  });

  const users = Array.isArray(onlineQuery.data) ? onlineQuery.data : [];
  const totalOnline = users.length;

  const filteredUsers = useMemo(() => users, [users]);

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
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
              marginRight: 14,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Online Users
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              {totalOnline} online right now
            </Text>
          </View>
          <Users color={theme.primary} size={20} />
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 10,
            }}
          >
            <Picker
              selectedValue={roleFilter}
              onValueChange={(value) => setRoleFilter(value)}
              style={{ height: 44, color: theme.text }}
              dropdownIconColor={theme.textSecondary}
            >
              {ROLE_OPTIONS.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>

          <View
            style={{
              flex: 1.4,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 10,
            }}
          >
            <Search color={theme.textSecondary} size={16} />
            <TextInput
              placeholder="Search by name, role, location"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                height: 44,
                marginLeft: 8,
                fontSize: 12,
                color: theme.text,
              }}
            />
          </View>
        </View>

        {onlineQuery.isLoading ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Loading online users...
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              No online users found.
            </Text>
          </View>
        ) : (
          filteredUsers.map((user, index) => (
            <MotiView
              key={user.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: index * 40 }}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", flex: 1, marginRight: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      overflow: "hidden",
                    }}
                  >
                    <UserAvatar
                      user={user}
                      size={44}
                      backgroundColor={theme.surface}
                      borderColor={theme.border}
                      textColor={theme.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    {formatRoleLabel(user.role)}
                  </Text>
                  {user.location ? (
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                      {user.location}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                    Online since: {formatRelativeTime(user.onlineSince)}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    Last seen: {formatRelativeTime(user.lastSeenAt || user.onlineSince)}
                  </Text>
                  </View>
                </View>
                <OnlineStatusChip isOnline theme={theme} />
              </View>
            </MotiView>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
