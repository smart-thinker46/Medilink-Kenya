import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

export default function PatientPaymentRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.getNotifications(),
  });

  const items = useMemo(() => {
    const list = notificationsQuery.data?.items || notificationsQuery.data || [];
    return list
      .filter(
        (item) => String(item?.type || "").toUpperCase() === "PAYMENT_REQUEST",
      )
      .map((item) => {
        let data = item?.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch {
            data = null;
          }
        }
        return {
          ...item,
          data,
        };
      });
  }, [notificationsQuery.data]);

  const handlePayRequest = async (request) => {
    const data = request?.data || {};
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Payment amount missing.", "warning");
      return;
    }
    const recipientId = String(data.medicId || data.recipientId || "").trim();
    if (!recipientId) {
      showToast("Recipient missing for this request.", "warning");
      return;
    }
    try {
      await apiClient.createPayment({
        amount,
        currency: data.currency || "KES",
        type: "SERVICE",
        description: data.description || "Additional charges",
        recipientId,
        recipientRole: "MEDIC",
        requestId: data.requestId || request?.relatedId || null,
      });
      showToast("Payment initiated. Complete checkout.", "success");
    } catch (error) {
      showToast(error.message || "Failed to initiate payment.", "error");
    }
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString();
  };

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
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
            Payment Requests
          </Text>
        </View>

        {items.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              No payment requests available.
            </Text>
          </View>
        ) : (
          items.map((request) => {
            const data = request?.data || {};
            return (
              <View
                key={request.id}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  {request.title || "Payment Request"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginTop: 6,
                  }}
                >
                  {request.message || data.description || "Additional charges"}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.primary,
                    marginTop: 8,
                  }}
                >
                  KES {formatMoney(data.amount || 0)}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onPress={() => handlePayRequest(request)}
                >
                  <CreditCard color="#FFFFFF" size={14} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    Pay Now
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
