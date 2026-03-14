import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { previewReceipt } from "@/utils/receiptExport";

const DEFAULT_PRICING = { monthly: 1000, yearly: 12000 };

export default function HospitalPaymentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const pricingQuery = useQuery({
    queryKey: ["subscription-pricing"],
    queryFn: () => apiClient.getSubscriptionPricing(),
  });
  const paymentsQuery = useQuery({
    queryKey: ["hospital-payments-history"],
    queryFn: () => apiClient.getPaymentHistory(),
  });
  const pricing = useMemo(() => {
    const map = pricingQuery.data || {};
    return map?.HOSPITAL_ADMIN || DEFAULT_PRICING;
  }, [pricingQuery.data]);
  const payments = useMemo(() => {
    const list = paymentsQuery.data?.items || paymentsQuery.data || [];
    return Array.isArray(list) ? list : [];
  }, [paymentsQuery.data]);
  const recentPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
      ),
    [payments],
  );

  const handleDownloadReceipt = async (payment) => {
    try {
      const status = String(payment?.status || "").toUpperCase();
      if (status !== "PAID") {
        showToast("Receipt is available after payment is completed.", "warning");
        return;
      }
      await previewReceipt({
        payment,
        payer: {
          name: payment?.payerName,
          email: payment?.payerEmail,
          phone: payment?.payerPhone,
        },
        recipient: {
          name: payment?.recipientName,
          role: payment?.recipientRole,
        },
      });
      showToast("Receipt downloaded.", "success");
    } catch (error) {
      showToast(error?.message || "Failed to download receipt.", "error");
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
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Payments & Payouts
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Subscription
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginBottom: 12,
              }}
            >
              Subscription: KES {pricing.monthly} per month or KES {pricing.yearly} per year.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/subscription-checkout",
                  params: { role: "HOSPITAL_ADMIN" },
                })
              }
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Subscribe Now
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Pay Medics
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginBottom: 12,
              }}
            >
              Send payments to hired medics or hospital staff.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/payment-checkout",
                  params: {
                    title: "Pay Medics",
                    roles: "MEDIC",
                    hiredOnly: "true",
                    methods: "mobile,bank,cash",
                  },
                })
              }
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Start Payment
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Incoming Payments
            </Text>
            {paymentsQuery.isLoading ? (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Loading payments...
              </Text>
            ) : recentPayments.length === 0 ? (
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                No payments recorded yet.
              </Text>
            ) : (
              recentPayments.slice(0, 6).map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {payment.description || payment.type || "Payment"} • {payment.currency || "KES"}{" "}
                    {payment.amount || 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {payment.payerName || payment.payerEmail || "Unknown payer"} →{" "}
                    {payment.recipientName || payment.recipientRole || "Recipient"}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                    {new Date(payment.createdAt || Date.now()).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDownloadReceipt(payment)}
                    style={{ marginTop: 6, alignSelf: "flex-start" }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                      Preview Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: theme.textSecondary,
              marginBottom: 12,
            }}
          >
            Payouts are processed via IntaSend.
          </Text>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
