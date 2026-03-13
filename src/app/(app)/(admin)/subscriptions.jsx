import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const statusOptions = ["ACTIVE", "PAUSED", "CANCELED"];
const defaultPlanMatrix = [
  { role: "MEDIC", monthly: 300, yearly: 4800 },
  { role: "PHARMACY_ADMIN", monthly: 500, yearly: 10000 },
  { role: "HOSPITAL_ADMIN", monthly: 1000, yearly: 12000 },
  { role: "PATIENT", monthly: 100, yearly: 1200 },
];

export default function AdminSubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => apiClient.adminGetSubscriptions(),
  });
  const subscriptions = subscriptionsQuery.data || [];

  const pricingQuery = useQuery({
    queryKey: ["admin-subscription-pricing"],
    queryFn: () => apiClient.adminGetSubscriptionPricing(),
  });

  const [pricingDraft, setPricingDraft] = useState(defaultPlanMatrix);

  useEffect(() => {
    const pricing = pricingQuery.data;
    if (pricing) {
      const mapped = defaultPlanMatrix.map((plan) => ({
        ...plan,
        monthly: Number(pricing?.[plan.role]?.monthly ?? plan.monthly),
        yearly: Number(pricing?.[plan.role]?.yearly ?? plan.yearly),
      }));
      setPricingDraft(mapped);
    }
  }, [pricingQuery.data]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.adminUpdateSubscription(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });

  const pricingMutation = useMutation({
    mutationFn: (payload) => apiClient.adminUpdateSubscriptionPricing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-pricing"] });
    },
  });

  const handleUpdate = async (id, status) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      showToast(`Subscription ${status.toLowerCase()}.`, "success");
    } catch (error) {
      showToast(error.message || "Update failed.", "error");
    }
  };

  const handlePricingChange = (role, field, value) => {
    setPricingDraft((current) =>
      current.map((plan) =>
        plan.role === role ? { ...plan, [field]: value } : plan,
      ),
    );
  };

  const handleSavePricing = async () => {
    const payload = pricingDraft.reduce((acc, plan) => {
      acc[plan.role] = {
        monthly: Number(plan.monthly) || 0,
        yearly: Number(plan.yearly) || 0,
      };
      return acc;
    }, {});
    try {
      await pricingMutation.mutateAsync(payload);
      showToast("Subscription pricing updated.", "success");
    } catch (error) {
      showToast(error.message || "Failed to update pricing.", "error");
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
          Subscriptions
        </Text>

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
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Pricing Matrix (Monthly / Yearly)
          </Text>
          <View style={{ marginTop: 10 }}>
            {pricingDraft.map((plan) => (
              <View key={plan.role} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
                  {plan.role}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={String(plan.monthly)}
                    onChangeText={(value) => handlePricingChange(plan.role, "monthly", value)}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: theme.text,
                    }}
                    placeholder="Monthly"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <TextInput
                    value={String(plan.yearly)}
                    onChangeText={(value) => handlePricingChange(plan.role, "yearly", value)}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: theme.text,
                    }}
                    placeholder="Yearly"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={{
                marginTop: 8,
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
              onPress={handleSavePricing}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                Save Pricing
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {subscriptions.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              No subscriptions recorded yet.
            </Text>
          </View>
        ) : (
          subscriptions.map((sub, index) => (
            <MotiView
              key={sub.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 60 }}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                {sub.role || "User"} • {sub.plan || "monthly"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                Amount: {sub.amount || 0} • Status: {sub.status || "ACTIVE"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor:
                        sub.status === status ? `${theme.primary}20` : theme.surface,
                      borderWidth: 1,
                      borderColor:
                        sub.status === status ? theme.primary : theme.border,
                    }}
                    onPress={() => handleUpdate(sub.id, status)}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_600SemiBold",
                        color: sub.status === status ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </MotiView>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
