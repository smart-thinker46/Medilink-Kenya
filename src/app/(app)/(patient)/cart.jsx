import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useCartStore } from "@/utils/cart/store";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { exportReceipt } from "@/utils/receiptExport";
import { resolveMediaUrl } from "@/utils/media";

export default function PatientCartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { items, load, setQuantity, removeItem, clear } = useCartStore();
  const prescriptionIdParam = Array.isArray(params?.prescriptionId)
    ? params.prescriptionId[0]
    : params?.prescriptionId;
  const prescriptionId =
    typeof prescriptionIdParam === "string" && prescriptionIdParam.trim().length > 0
      ? prescriptionIdParam.trim()
      : "";

  const paymentMethod = "intasend";
  const [currency, setCurrency] = useState("KES");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const prescriptionQuery = useQuery({
    queryKey: ["medical-record", prescriptionId],
    queryFn: () => apiClient.getMedicalRecordById(prescriptionId),
    enabled: Boolean(prescriptionId),
  });
  const ratesQuery = useQuery({
    queryKey: ["payment-rates"],
    queryFn: () => apiClient.getPaymentRates(),
  });
  const usdKesRate = Number(ratesQuery.data?.USD_KES || 150);

  const pharmacyId = useMemo(() => items?.[0]?.pharmacyId, [items]);
  const hasMultiplePharmacies = useMemo(() => {
    const ids = new Set(items.map((item) => item.pharmacyId).filter(Boolean));
    return ids.size > 1;
  }, [items]);
  const hasPrescriptionRequiredItems = useMemo(
    () =>
      items.some((item) =>
        Boolean(item?.requiresPrescription ?? item?.prescriptionRequired ?? item?.prescription),
      ),
    [items],
  );

  const totalKes = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0),
    [items],
  );
  const total = useMemo(() => {
    if (currency === "USD") {
      return Number((totalKes / usdKesRate).toFixed(2));
    }
    return totalKes;
  }, [currency, totalKes, usdKesRate]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Cart is empty");
      if (hasMultiplePharmacies) {
        throw new Error("Cart has items from multiple pharmacies. Checkout one at a time.");
      }
      if (!pharmacyId) throw new Error("Missing pharmacy for this order");
      if (hasPrescriptionRequiredItems && !prescriptionId) {
        throw new Error(
          "This cart includes prescription-only items. Select a prescription from Medical Records first.",
        );
      }

      const order = await apiClient.createOrder({
        pharmacyId,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
        })),
        total: totalKes,
        currency: "KES",
        notes,
        prescriptionId: prescriptionId || undefined,
      });

      const payment = await apiClient.createPayment({
        amount: total,
        currency,
        method: paymentMethod,
        type: "ORDER",
        orderId: order?.id,
        recipientId: pharmacyId,
        recipientRole: "PHARMACY_ADMIN",
        phone,
        description: "Pharmacy order payment",
      });

      return { order, payment };
    },
    onSuccess: async ({ payment }) => {
      showToast(
        payment?.status === "PAID"
          ? "Order paid successfully."
          : "Payment initiated. Complete payment in IntaSend checkout.",
        "success",
      );
      if (payment) {
        try {
          await exportReceipt({ payment, payer: { phone } });
        } catch {
          // ignore receipt failures
        }
      }
      await clear();
      router.back();
    },
    onError: (error) => {
      showToast(error.message || "Checkout failed.", "error");
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
            Cart Checkout
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
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              Your cart is empty.
            </Text>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    marginRight: 10,
                    backgroundColor: theme.surface,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.image || item.imageUrl || item.photoUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(item.image || item.imageUrl || item.photoUrl) }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>No image</Text>
                  )}
                </View>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    KES {item.price} • {item.cartQuantity} pcs
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: theme.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Trash2 color={theme.iconColor} size={16} />
                  </TouchableOpacity>
                  <TextInput
                    value={String(item.cartQuantity)}
                    onChangeText={(value) => setQuantity(item.id, value)}
                    keyboardType="numeric"
                    style={{
                      width: 48,
                      height: 32,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      textAlign: "center",
                      color: theme.text,
                      paddingHorizontal: 4,
                    }}
                  />
                </View>
              </View>
            ))}

            {hasPrescriptionRequiredItems ? (
              <View
                style={{
                  backgroundColor: prescriptionId ? `${theme.success}12` : `${theme.warning}12`,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: prescriptionId ? `${theme.success}55` : `${theme.warning}65`,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_700Bold",
                    color: prescriptionId ? theme.success : theme.warning,
                    marginBottom: 4,
                  }}
                >
                  Prescription Required
                </Text>
                {prescriptionId ? (
                  <>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      Prescription ID: {prescriptionId}
                    </Text>
                    {prescriptionQuery.data?.medic?.fullName ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                        Issued by: {prescriptionQuery.data.medic.fullName}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                      Choose a prescription in Medical Records before checkout.
                    </Text>
                    <TouchableOpacity
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.warning,
                        backgroundColor: `${theme.warning}15`,
                      }}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/(patient)/medical-history",
                          params: { tab: "prescriptions" },
                        })
                      }
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_600SemiBold",
                          color: theme.warning,
                        }}
                      >
                        Select Prescription
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 14,
                padding: 14,
                marginTop: 10,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>Total</Text>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.text }}>
                {currency} {total}
              </Text>
              {currency === "USD" && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                  Approx KES {totalKes} (1 USD ≈ {usdKesRate} KES)
                </Text>
              )}
            </View>

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Currency
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
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
                    {code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Payments are processed via IntaSend.
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
                Checkout Phone (optional)
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="07xx xxx xxx"
                keyboardType="phone-pad"
                placeholderTextColor={theme.textTertiary}
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

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Delivery notes"
              placeholderTextColor={theme.textTertiary}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
              onPress={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isLoading}
            >
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                Pay {currency} {total}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
