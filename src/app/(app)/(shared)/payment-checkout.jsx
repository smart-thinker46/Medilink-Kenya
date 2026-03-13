import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { exportReceipt } from "@/utils/receiptExport";
import { useAuthStore } from "@/utils/auth/store";

const ROLE_LABELS = {
  MEDIC: "Medics",
  HOSPITAL_ADMIN: "Hospitals",
  PHARMACY_ADMIN: "Pharmacies",
  PATIENT: "Patients",
  SUPER_ADMIN: "Admin",
};

export default function PaymentCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();

  const title = params?.title || "Checkout";
  const roleParam = typeof params?.roles === "string" ? params.roles : "MEDIC";
  const roles = roleParam.split(",").map((r) => r.trim()).filter(Boolean);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const selectedMethod = "intasend";

  const ratesQuery = useQuery({
    queryKey: ["payment-rates"],
    queryFn: () => apiClient.getPaymentRates(),
  });
  const usdKesRate = Number(ratesQuery.data?.USD_KES || 150);

  const medicsQuery = useQuery({
    queryKey: ["payment-medics"],
    queryFn: () => apiClient.getMedics(),
    enabled: selectedRole === "MEDIC",
  });
  const medics = medicsQuery.data?.items || medicsQuery.data || [];

  const selectedRecipient = useMemo(() => {
    return medics.find((medic) => medic.id === recipientId);
  }, [medics, recipientId]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const numericAmount = Number(amount);
      if (!recipientId) throw new Error("Select a recipient");
      if (!numericAmount || numericAmount <= 0) throw new Error("Enter a valid amount");
      return apiClient.createPayment({
        amount: numericAmount,
        currency,
        method: selectedMethod,
        recipientId,
        recipientRole: selectedRole,
        type: "TRANSFER",
        phone: auth?.user?.phone,
      });
    },
    onSuccess: async (payment) => {
      showToast("Payment initiated.", "success");
      if (payment) {
        try {
          await exportReceipt({
            payment,
            payer: { email: payment.payerEmail },
            recipient: { role: payment.recipientRole, name: selectedRecipient?.name },
          });
        } catch {
          // ignore receipt failures
        }
      }
      router.back();
    },
    onError: (error) => {
      showToast(error.message || "Payment failed.", "error");
    },
  });

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
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
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            {title}
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor:
                  selectedRole === role ? `${theme.primary}20` : theme.surface,
                borderWidth: 1,
                borderColor: selectedRole === role ? theme.primary : theme.border,
              }}
              onPress={() => setSelectedRole(role)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: selectedRole === role ? theme.primary : theme.textSecondary,
                }}
              >
                {ROLE_LABELS[role] || role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedRole === "MEDIC" ? (
          <View style={{ marginBottom: 16 }}>
            {(medics || []).map((medic) => (
              <TouchableOpacity
                key={medic.id}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: recipientId === medic.id ? 2 : 1,
                  borderColor:
                    recipientId === medic.id ? theme.primary : theme.border,
                }}
                onPress={() => setRecipientId(medic.id)}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  {medic.name || medic.fullName || "Medic"}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                  {medic.specialization || "General Practice"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
              Recipient ID
            </Text>
            <TextInput
              value={recipientId}
              onChangeText={setRecipientId}
              placeholder="Paste recipient user ID"
              placeholderTextColor={theme.textSecondary}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          {["KES", "USD"].map((code) => (
            <TouchableOpacity
              key={code}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor:
                  currency === code ? `${theme.primary}20` : theme.surface,
                borderWidth: 1,
                borderColor: currency === code ? theme.primary : theme.border,
              }}
              onPress={() => setCurrency(code)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: currency === code ? theme.primary : theme.textSecondary,
                  textAlign: "center",
                }}
              >
                Pay in {code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
            Amount ({currency})
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />
          {selectedRecipient && (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              Paying: {selectedRecipient.name || selectedRecipient.fullName}
            </Text>
          )}
        </View>

        {currency === "USD" && (
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
            IntaSend checkout will use 1 USD ≈ {usdKesRate} KES.
          </Text>
        )}

        <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
          Payments are processed via IntaSend.
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 8,
          }}
          onPress={() => paymentMutation.mutate()}
          disabled={paymentMutation.isLoading}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            Pay Now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
