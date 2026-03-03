import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, FileText, Shield } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const EFFECTIVE_DATE = "March 2, 2026";

const POLICY_SECTIONS = [
  {
    id: "overview",
    title: "1. Service Scope",
    body:
      "MediLink provides a platform that connects patients, medics, hospitals, and pharmacies for communication, booking, shift management, product access, and payments. It does not replace emergency hotlines or direct clinical judgment.",
  },
  {
    id: "eligibility",
    title: "2. Account Eligibility",
    body:
      "Users must provide accurate identity and profile information. Professional users must provide valid licenses and credentials where required. You are responsible for protecting your login credentials.",
  },
  {
    id: "medical-disclaimer",
    title: "3. Medical Disclaimer",
    body:
      "Information in the app is for coordination and communication support. Clinical decisions remain the responsibility of licensed professionals. In emergencies, contact local emergency services immediately.",
  },
  {
    id: "appointments",
    title: "4. Appointments and Shifts",
    body:
      "Appointments and shifts are created and accepted by users. Availability, completion, cancellation, and payment terms are governed by recorded status and role permissions in the app.",
  },
  {
    id: "pharmacy",
    title: "5. Pharmacy and Product Use",
    body:
      "Product listing, stock, pricing, and prescriptions are managed by authorized facilities. Buyers must verify product suitability and dosage with licensed professionals.",
  },
  {
    id: "payments",
    title: "6. Payments, Subscription, and Premium Features",
    body:
      "Payments are processed through the configured IntaSend payment gateway. Premium features are access-controlled server-side and require valid subscription status.",
  },
  {
    id: "privacy",
    title: "7. Privacy and Data Handling",
    body:
      "We store profile, operational, and communication data required to deliver features. Location is stored approximately for matching and emergency workflows. You can manage privacy and notification settings in-app.",
  },
  {
    id: "security",
    title: "8. Security and Abuse Prevention",
    body:
      "Unauthorized access, impersonation, payment abuse, scraping, reverse engineering, or attempts to bypass premium checks are prohibited and may result in suspension or legal action.",
  },
  {
    id: "content",
    title: "9. User Content and Communications",
    body:
      "Users are responsible for content they upload or send. Harassment, hate speech, fraud, and unlawful content are prohibited. We may moderate or remove content for safety and compliance.",
  },
  {
    id: "retention",
    title: "10. Data Retention and Requests",
    body:
      "Data is retained for operational, security, and compliance needs. Users may request data export or deletion through support. Some records may be retained where required by law.",
  },
  {
    id: "liability",
    title: "11. Limitation of Liability",
    body:
      "To the extent permitted by law, MediLink is not liable for indirect, incidental, or consequential losses arising from network outages, third-party service failures, or user-provided inaccuracies.",
  },
  {
    id: "changes",
    title: "12. Policy Updates",
    body:
      "Policies may be updated to reflect legal, technical, or operational changes. Continued use of the app after updates means you accept the updated policy terms.",
  },
];

export default function PoliciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiClient.updateProfile({
        termsAcceptedAt: new Date().toISOString(),
        privacyPolicyAcceptedAt: new Date().toISOString(),
      }),
    onSuccess: () => showToast("Policy acceptance saved.", "success"),
    onError: (error) =>
      showToast(error?.message || "Could not save policy acceptance.", "error"),
  });

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/(app)/(shared)/settings");
            }}
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
            Policies & Terms
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <FileText color={theme.primary} size={18} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                fontFamily: "Inter_700Bold",
                color: theme.text,
              }}
            >
              Terms, Privacy, and Acceptable Use
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Effective Date: {EFFECTIVE_DATE}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
            This policy applies to all user roles in MediLink and governs platform use,
            privacy, security, and legal responsibilities.
          </Text>
        </View>

        {POLICY_SECTIONS.map((section) => (
          <View
            key={section.id}
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: theme.text }}>
              {section.title}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>
              {section.body}
            </Text>
          </View>
        ))}

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Shield color={theme.primary} size={16} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              Need clarification?
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(shared)/support")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 12,
            }}
          >
            <FileText color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 12, color: theme.text }}>
              Contact support for policy questions
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="I Agree and Continue"
          onPress={() => acceptMutation.mutate()}
          loading={acceptMutation.isLoading}
          style={{ marginTop: 14 }}
          leftIcon={BadgeCheck}
        />
      </ScrollView>
    </ScreenLayout>
  );
}
