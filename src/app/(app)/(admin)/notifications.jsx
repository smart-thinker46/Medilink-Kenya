import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const audienceOptions = [
  { label: "All Users", value: "ALL" },
  { label: "Patients", value: "PATIENT" },
  { label: "Medics", value: "MEDIC" },
  { label: "Hospitals", value: "HOSPITAL_ADMIN" },
  { label: "Pharmacies", value: "PHARMACY_ADMIN" },
  { label: "Single User", value: "USER" },
];

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [targetUserId, setTargetUserId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");

  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => apiClient.adminGetNotifications(),
  });
  const adminNotifications = notificationsQuery.data || [];

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast("Please enter a title and message.", "warning");
      return;
    }
    if (audience === "USER" && !targetUserId.trim()) {
      showToast("Please enter a target user ID.", "warning");
      return;
    }
    try {
      await apiClient.adminSendNotification({
        title,
        message,
        audience,
        userId: audience === "USER" ? targetUserId : undefined,
        sendEmail,
        emailSubject: emailSubject || title,
      });
      showToast(
        sendEmail
          ? "Notification and email sent."
          : "Notification sent.",
        "success",
      );
      setTitle("");
      setMessage("");
      setTargetUserId("");
      setEmailSubject("");
      notificationsQuery.refetch();
    } catch (error) {
      showToast(error.message || "Failed to send notification.", "error");
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
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 16,
          }}
        >
          Send Notification
        </Text>

        <TextInput
          placeholder="Notification title"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
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
          placeholder="Message"
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          style={{
            height: 120,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingTop: 12,
            color: theme.text,
            marginBottom: 16,
          }}
        />

        {audience === "USER" && (
          <TextInput
            placeholder="Target User ID"
            placeholderTextColor={theme.textSecondary}
            value={targetUserId}
            onChangeText={setTargetUserId}
            style={{
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              marginBottom: 16,
            }}
          />
        )}

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Send Email Too
            </Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
              Delivers this message by email and in-app notification.
            </Text>
          </View>
          <Switch
            value={sendEmail}
            onValueChange={setSendEmail}
            thumbColor={sendEmail ? theme.primary : theme.border}
            trackColor={{ true: `${theme.primary}66`, false: theme.border }}
          />
        </View>

        {sendEmail && (
          <TextInput
            placeholder="Email subject (optional)"
            placeholderTextColor={theme.textSecondary}
            value={emailSubject}
            onChangeText={setEmailSubject}
            style={{
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              marginBottom: 16,
            }}
          />
        )}

        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Audience
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {audienceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  audience === option.value ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  audience === option.value ? theme.primary : theme.border,
              }}
              onPress={() => setAudience(option.value)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    audience === option.value ? theme.primary : theme.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
          onPress={handleSend}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            Send Notification
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Recent Notifications
          </Text>
          {adminNotifications.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                No notifications sent yet.
              </Text>
            </View>
          ) : (
            adminNotifications.slice(0, 10).map((item, index) => (
              <MotiView
                key={item.id || `${item.title}-${index}`}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 400, delay: index * 60 }}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  {item.message}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6 }}>
                  Audience: {item.audience || "ALL"} {item.targetUserId ? `• ${item.targetUserId}` : ""}
                </Text>
              </MotiView>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
