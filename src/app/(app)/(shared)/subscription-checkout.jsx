import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CreditCard } from "lucide-react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { normalizeRole } from "@/utils/communicationRules";
import { exportReceipt } from "@/utils/receiptExport";

const DEFAULT_PRICING = {
  MEDIC: { monthly: 300, yearly: 4800 },
  PHARMACY_ADMIN: { monthly: 500, yearly: 10000 },
  HOSPITAL_ADMIN: { monthly: 1000, yearly: 12000 },
  PATIENT: { monthly: 0, yearly: 0 },
};

const METHOD_ICONS = {
  intasend: CreditCard,
};

export default function SubscriptionCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { auth } = useAuthStore();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();

  const role = normalizeRole(params?.role || auth?.user?.role);
  const pricingQuery = useQuery({
    queryKey: ["subscription-pricing"],
    queryFn: () => apiClient.getSubscriptionPricing(),
  });
  const ratesQuery = useQuery({
    queryKey: ["payment-rates"],
    queryFn: () => apiClient.getPaymentRates(),
  });
  const usdKesRate = Number(ratesQuery.data?.USD_KES || 150);
  const pricingMap = pricingQuery.data || DEFAULT_PRICING;
  const pricing = pricingMap?.[role];
  const [plan, setPlan] = useState("monthly");
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [currency, setCurrency] = useState("KES");

  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiClient.getPaymentMethods(),
  });
  const methods = methodsQuery.data || [];
  useEffect(() => {
    if (!selectedMethod && methods.length > 0) {
      setSelectedMethod(methods[0]?.id || "intasend");
    }
  }, [methods, selectedMethod]);

  const amountKes = useMemo(() => {
    if (!pricing) return 0;
    return plan === "yearly" ? pricing.yearly : pricing.monthly;
  }, [pricing, plan]);
  const amount = useMemo(() => {
    if (!amountKes) return 0;
    if (currency === "USD") {
      return Number((amountKes / usdKesRate).toFixed(2));
    }
    return amountKes;
  }, [amountKes, currency, usdKesRate]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMethod) throw new Error("Select a payment method");
      const payment = await apiClient.createPayment({
        amount,
        currency,
        method: selectedMethod,
        type: "SUBSCRIPTION",
        plan,
        phone: auth?.user?.phone,
      });
      if (payment?.status === "PAID") {
        await apiClient.createSubscription({
          paymentId: payment.id,
          plan,
          amount,
          currency,
        });
      }
      return payment;
    },
    onSuccess: async (payment) => {
      showToast(
        payment?.status === "PAID"
          ? "Subscription activated."
          : "Subscription payment initiated.",
        "success",
      );
      if (payment) {
        try {
          await exportReceipt({
            payment,
            payer: { email: payment.payerEmail },
            recipient: { role: role, name: role?.replace("_", " ") },
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
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
            Subscription Checkout
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Plan for {role?.replace("_", " ")}
          </Text>
          {pricing ? (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              Monthly: KES {pricing.monthly} • Yearly: KES {pricing.yearly}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              No subscription required for this role.
            </Text>
          )}
        </View>

        {pricing && (
          <>
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

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              {["monthly", "yearly"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor:
                      plan === option ? `${theme.primary}20` : theme.surface,
                    borderWidth: 1,
                    borderColor: plan === option ? theme.primary : theme.border,
                  }}
                  onPress={() => setPlan(option)}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: plan === option ? theme.primary : theme.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {option === "monthly" ? "Monthly" : "Yearly"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 10,
              }}
            >
              Select Payment Method
            </Text>

            {methods.map((method) => {
              const Icon = METHOD_ICONS[method.id] || CreditCard;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                    borderWidth: selectedMethod === method.id ? 2 : 1,
                    borderColor:
                      selectedMethod === method.id ? theme.primary : theme.border,
                  }}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Icon color={theme.iconColor} size={18} />
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.text }}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

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
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Pay {currency} {amount}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
