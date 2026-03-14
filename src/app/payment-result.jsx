import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { previewReceipt } from "@/utils/receiptExport";
import { useToast } from "@/components/ToastProvider";

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const bookingRef = useRef(false);

  const reference = useMemo(() => {
    const apiRef = params?.api_ref || params?.apiRef || params?.api_ref_id;
    const paymentId = params?.payment_id || params?.paymentId || params?.id;
    const raw = String(apiRef || paymentId || "").trim();
    return raw || null;
  }, [params]);

  const statusParam = String(params?.status || params?.state || "").trim();
  const messageParam = String(params?.message || params?.reason || "").trim();

  useEffect(() => {
    let mounted = true;
    const loadPayment = async () => {
      if (!reference) {
        setLoading(false);
        return;
      }
      try {
        const details = await apiClient.getPaymentDetails({ apiRef: reference });
        if (!mounted) return;
        setPayment(details);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load payment details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPayment();
    return () => {
      mounted = false;
    };
  }, [reference]);

  useEffect(() => {
    if (!reference || !payment || bookingRef.current) return;
    const status = String(payment?.status || "").toUpperCase();
    if (status !== "PAID") return;
    bookingRef.current = true;

    (async () => {
      try {
        const key = `pending-appointment:${reference}`;
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return;
        const payload = JSON.parse(raw);
        await apiClient.createAppointment(payload);
        await AsyncStorage.removeItem(key);
        setBookingStatus("Appointment booked successfully.");
      } catch (err) {
        setBookingStatus(err?.message || "Failed to finalize appointment.");
      }
    })();
  }, [reference, payment]);

  const finalizeAppointment = async () => {
    if (!reference) {
      setBookingStatus("Missing payment reference.");
      return;
    }
    setFinalizing(true);
    try {
      const details = payment || (await apiClient.getPaymentDetails({ apiRef: reference }));
      const status = String(details?.status || "").toUpperCase();
      if (status !== "PAID") {
        setBookingStatus("Payment not completed yet.");
        return;
      }
      const key = `pending-appointment:${reference}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        setBookingStatus("No pending appointment found for this payment.");
        return;
      }
      const payload = JSON.parse(raw);
      await apiClient.createAppointment(payload);
      await AsyncStorage.removeItem(key);
      setBookingStatus("Appointment booked successfully.");
    } catch (err) {
      setBookingStatus(err?.message || "Failed to finalize appointment.");
    } finally {
      setFinalizing(false);
    }
  };

  const resolvedStatus =
    String(payment?.status || statusParam || payment?.state || "").toUpperCase() || "UNKNOWN";

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString();
  };

  const description = payment?.description || payment?.reason || payment?.comment || messageParam;

  const handleDownloadReceipt = async () => {
    try {
      if (!payment) {
        throw new Error("Payment details not available yet.");
      }
      const status = String(payment?.status || "").toUpperCase();
      if (status !== "PAID") {
        throw new Error("Receipt is available after payment is completed.");
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
    } catch (err) {
      showToast(err?.message || "Failed to download receipt.", "error");
    }
  };

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 40,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 12,
          }}
        >
          Payment Result
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Fetching payment details...
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
              }}
            >
              Status: {resolvedStatus}
            </Text>

            {reference ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Reference: {reference}
              </Text>
            ) : null}

            {description ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                {description}
              </Text>
            ) : null}

            {payment ? (
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  Amount: {formatMoney(payment.amount)} {payment.currency || "KES"}
                </Text>
                {payment.method ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                  >
                    Method: {String(payment.method).toUpperCase()}
                  </Text>
                ) : null}
                {payment.type ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                  >
                    Type: {payment.type}
                  </Text>
                ) : null}
                {payment.createdAt ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                  >
                    Created: {new Date(payment.createdAt).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.error,
                }}
              >
                {error}
              </Text>
            ) : null}

            {bookingStatus ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: bookingStatus.includes("Failed") ? theme.error : theme.success,
                }}
              >
                {bookingStatus}
              </Text>
            ) : null}

            {reference ? (
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={finalizeAppointment}
                disabled={finalizing}
              >
                {finalizing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.primary,
                    }}
                  >
                    Finalize Appointment
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}

            {payment ? (
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
                onPress={handleDownloadReceipt}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Preview Receipt
                </Text>
              </TouchableOpacity>
            ) : null}

            {!reference && !payment ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                No payment reference was provided. Please return to the app and check the payment
                history.
              </Text>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
          }}
          onPress={() => router.replace("/(app)")}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
