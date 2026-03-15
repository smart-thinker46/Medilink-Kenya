import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Moon, Sun, Monitor, LogOut, Lock } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { useI18n } from "@/utils/i18n";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import OnlineStatusChip from "@/components/OnlineStatusChip";
import { useAppSettingsStore } from "@/utils/appSettings/store";

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, themeMode, setThemeMode, language, setLanguage, currency, setCurrency } = useAppTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { auth, logout } = useAuthStore();
  const { isUserOnline } = useOnlineUsers();
  const isOnline = isUserOnline(auth?.user);
  const queryClient = useQueryClient();
  const setContact = useAppSettingsStore((s) => s.setContact);

  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("email");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const contactQuery = useQuery({
    queryKey: ["admin", "app-settings", "contact"],
    queryFn: () => apiClient.adminGetAppContactInfo(),
  });

  useEffect(() => {
    const contact = contactQuery.data?.contact || contactQuery.data?.data?.contact;
    if (!contact || typeof contact !== "object") return;
    setContactEmail(String(contact.email || ""));
    setContactPhone(String(contact.phone || ""));
    setContactAddress(String(contact.address || ""));
    setContactWebsite(String(contact.website || ""));
    setContactWhatsapp(String(contact.whatsapp || ""));
  }, [contactQuery.data]);

  const updateContactMutation = useMutation({
    mutationFn: (payload) => apiClient.adminUpdateAppContactInfo(payload),
    onSuccess: async (res) => {
      const updated = res?.contact || res?.data?.contact;
      if (updated && typeof updated === "object") {
        setContact(updated);
      }
      showToast("Contact info updated.", "success");
      await queryClient.invalidateQueries({ queryKey: ["admin", "app-settings", "contact"] });
      // Keep public app settings in sync too.
      await queryClient.invalidateQueries({ queryKey: ["app-settings", "contact"] });
    },
    onError: (error) => {
      showToast(error?.message || "Failed to update contact info.", "error");
    },
  });

  const handleSend = async () => {
    if (!message.trim()) {
      showToast("Please enter a message.", "warning");
      return;
    }
    try {
      await apiClient.adminSendMessage({ channel, message, audience: "ALL" });
      showToast("Message dispatched.", "success");
      setMessage("");
    } catch (error) {
      showToast(error.message || "Failed to send message.", "error");
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const options = [
    { id: "auto", label: "System", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  const languageOptions = [
    { id: "en", label: "English" },
    { id: "sw", label: "Swahili" },
  ];

  const currencyOptions = [
    { id: "KES", label: "KES" },
    { id: "USD", label: "USD" },
  ];

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
          {t("broadcast_message")}
        </Text>
        <OnlineStatusChip isOnline={isOnline} theme={theme} style={{ marginBottom: 16 }} />

        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginBottom: 8,
          }}
        >
          {t("channel")}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {["email", "sms"].map((option) => (
            <TouchableOpacity
              key={option}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  channel === option ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor:
                  channel === option ? theme.primary : theme.border,
              }}
              onPress={() => setChannel(option)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    channel === option ? theme.primary : theme.textSecondary,
                }}
              >
                {option.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder={t("broadcast_message")}
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          style={{
            height: 140,
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
          {t("send_message")}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />

        <Text
          style={{
            fontSize: 16,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          {t("language")}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {languageOptions.map((option) => {
            const isActive = language === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setLanguage(option.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          {t("currency")}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {currencyOptions.map((option) => {
            const isActive = currency === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setCurrency(option.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          Appearance
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = themeMode === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? `${theme.primary}20` : theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
                onPress={() => setThemeMode(option.id)}
                activeOpacity={0.8}
              >
                <Icon color={isActive ? theme.primary : theme.textSecondary} size={18} />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          App Contact Info
        </Text>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 24,
            gap: 10,
          }}
        >
          <TextInput
            placeholder="Support email"
            placeholderTextColor={theme.textSecondary}
            value={contactEmail}
            onChangeText={setContactEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TextInput
            placeholder="Support phone"
            placeholderTextColor={theme.textSecondary}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TextInput
            placeholder="Address"
            placeholderTextColor={theme.textSecondary}
            value={contactAddress}
            onChangeText={setContactAddress}
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TextInput
            placeholder="Website (optional)"
            placeholderTextColor={theme.textSecondary}
            value={contactWebsite}
            onChangeText={setContactWebsite}
            autoCapitalize="none"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TextInput
            placeholder="WhatsApp (optional)"
            placeholderTextColor={theme.textSecondary}
            value={contactWhatsapp}
            onChangeText={setContactWhatsapp}
            autoCapitalize="none"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              color: theme.text,
              fontSize: 13,
            }}
          />

          <TouchableOpacity
            style={{
              marginTop: 6,
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              opacity: updateContactMutation.isPending ? 0.7 : 1,
            }}
            onPress={() =>
              updateContactMutation.mutate({
                email: contactEmail,
                phone: contactPhone,
                address: contactAddress,
                website: contactWebsite,
                whatsapp: contactWhatsapp,
              })
            }
            disabled={updateContactMutation.isPending}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
              }}
            >
              {updateContactMutation.isPending ? "Saving..." : "Save Contact Info"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontSize: 16,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          {t("account")}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 12,
          }}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Lock color={theme.primary} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
              marginLeft: 8,
            }}
          >
            Reset Password
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={handleLogout}
        >
          <LogOut color={theme.error} size={18} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: theme.error,
              marginLeft: 8,
            }}
          >
            {t("logout")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
