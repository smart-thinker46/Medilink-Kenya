import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  MessageCircle,
  Phone,
  Search,
  FileText,
  HelpCircle,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";

const ROLE_HOME_PATH = {
  PATIENT: "/(app)/(patient)",
  MEDIC: "/(app)/(medic)",
  HOSPITAL_ADMIN: "/(app)/(hospital)",
  PHARMACY_ADMIN: "/(app)/(pharmacy)",
  SUPER_ADMIN: "/(app)/(admin)",
};

const FAQ_ITEMS = [
  {
    id: "faq-appointments",
    question: "How do I book and reschedule appointments?",
    answer:
      "Open Book Appointment, choose a medic, date and time, then confirm. To reschedule, open your appointment list and update if the slot is still available.",
    tags: "appointment booking reschedule medic",
  },
  {
    id: "faq-subscription",
    question: "Why are some features locked behind subscription?",
    answer:
      "Premium features include advanced AI tools and selected workflow accelerators. Subscription status is validated server-side for account security.",
    tags: "subscription premium payment locked",
  },
  {
    id: "faq-payments",
    question: "What payment methods are supported?",
    answer:
      "IntaSend is the default checkout gateway in this app. Ensure your checkout details are correct before completing payment.",
    tags: "payment intasend checkout gateway",
  },
  {
    id: "faq-location",
    question: "How does location sharing work?",
    answer:
      "You can set location manually or from map pinning. The app stores approximate coordinates for matching nearby medics and emergency support.",
    tags: "location map nearby emergency",
  },
  {
    id: "faq-security",
    question: "How can I keep my account secure?",
    answer:
      "Use a strong password, log out from shared devices, keep your phone protected, and review privacy/notification settings regularly.",
    tags: "security password privacy account",
  },
  {
    id: "faq-chat",
    question: "Messages are received but replies fail. What should I check?",
    answer:
      "Verify network connectivity and API reachability first. If issue persists, report via Issue screen with screenshot and timestamp.",
    tags: "chat messages reply network",
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();
  const [query, setQuery] = useState("");
  const [sendingSupportRequest, setSendingSupportRequest] = useState(false);

  const filteredFaq = useMemo(() => {
    const search = String(query || "").trim().toLowerCase();
    if (!search) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) => {
      const haystack = `${item.question} ${item.answer} ${item.tags}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [query]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(ROLE_HOME_PATH[role] || "/(app)/(shared)/settings");
  };

  const openSupportEmail = async () => {
    const subject = encodeURIComponent("MediLink Support Request");
    const body = encodeURIComponent(
      "Hello Support,\n\nPlease help me with:\n\nDevice:\nApp role:\nIssue details:\n\nThanks.",
    );
    const url = `mailto:support@medilink.africa?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast("Could not open email app on this device.", "warning");
      return;
    }
    await Linking.openURL(url);
  };

  const openSupportCall = async () => {
    const url = "tel:+254718835212";
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast("Phone dialer is unavailable on this device.", "warning");
      return;
    }
    await Linking.openURL(url);
  };

  const openLiveChat = () => {
    Alert.alert(
      "Request Admin Support",
      "Send a chat request to admin support? Chat will open only after admin accepts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: async () => {
            if (sendingSupportRequest) return;
            setSendingSupportRequest(true);
            try {
              await apiClient.requestSupportChat({
                note: `Support requested by ${role || "USER"} from mobile app.`,
              });
              showToast("Request sent. Wait for admin to accept.", "success");
            } catch (error) {
              showToast(error?.message || "Unable to send support chat request.", "error");
            } finally {
              setSendingSupportRequest(false);
            }
          },
        },
      ],
    );
  };

  const reportIssue = () => {
    router.push("/(app)/complaint");
  };

  const confirmCriticalIssue = () => {
    Alert.alert(
      "Critical Issue",
      "If this is urgent and affects patient safety, call emergency services immediately.",
      [{ text: "OK" }],
    );
  };

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleBack}
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
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Help & Support
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 14,
            marginBottom: 14,
          }}
        >
          <Search color={theme.iconColor} size={16} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search help by keyword"
            placeholderTextColor={theme.textSecondary}
            style={{
              flex: 1,
              marginLeft: 8,
              paddingVertical: 12,
              color: theme.text,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
            }}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: theme.text }}>
            Contact Support
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
            Support hours: Monday to Saturday, 8:00 AM to 8:00 PM (EAT)
          </Text>

          <TouchableOpacity
            onPress={openSupportCall}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Phone color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              Call: 0718835212
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openSupportEmail}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Mail color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              Email: support@medilink.africa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openLiveChat}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MessageCircle color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              {sendingSupportRequest ? "Sending request..." : "Request Admin Support Chat"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: theme.text }}>
            Quick Actions
          </Text>

          <TouchableOpacity
            onPress={reportIssue}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <AlertTriangle color={theme.warning} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              Report a bug or complaint
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmCriticalIssue}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <AlertTriangle color={theme.error} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              Critical safety guidance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(app)/(shared)/policies")}
            style={{
              marginTop: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <FileText color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>
              View Policies and Terms
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <HelpCircle color={theme.primary} size={16} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                fontFamily: "Inter_700Bold",
                color: theme.text,
              }}
            >
              Frequently Asked Questions
            </Text>
          </View>

          {filteredFaq.length ? (
            filteredFaq.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  {item.question}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
                  {item.answer}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              No FAQ match found. Try a different keyword or contact support directly.
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
