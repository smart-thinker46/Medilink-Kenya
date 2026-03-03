import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react-native";
import Svg, { Circle, G } from "react-native-svg";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { resolveMediaUrl } from "@/utils/media";

const Donut = ({ title, data = [], theme, size = 120, stroke = 16, flat = false }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let running = 0;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 160,
        backgroundColor: flat ? "transparent" : theme.card,
        borderRadius: 14,
        padding: flat ? 0 : 12,
        borderWidth: flat ? 0 : 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>
        {title}
      </Text>
      <View style={{ alignItems: "center", justifyContent: "center", marginTop: 10 }}>
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Svg width={size} height={size}>
            <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.surface}
                strokeWidth={stroke}
                fill="transparent"
              />
              {total > 0 &&
                data.map((item, index) => {
                  const value = Number(item.value || 0);
                  const segment = (value / total) * circumference;
                  const dashoffset = circumference - running;
                  running += segment;
                  return (
                    <Circle
                      key={`${item.label}-${index}`}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${segment} ${circumference - segment}`}
                      strokeDashoffset={dashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  );
                })}
            </G>
          </Svg>
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Nunito_700Bold", color: theme.text }}>
              {total}
            </Text>
            <Text style={{ fontSize: 10, color: theme.textSecondary }}>Total</Text>
          </View>
        </View>
      </View>
        <View style={{ marginTop: 8 }}>
        {data.map((item) => (
          <View
            key={`${title}-${item.label}`}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: item.color,
                marginRight: 6,
              }}
            />
            <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary }}>{item.label}</Text>
            <Text style={{ fontSize: 11, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              {item.value}
            </Text>
          </View>
        ))}
        </View>
      </View>
  );
};

export default function HospitalAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  const analyticsQuery = useQuery({
    queryKey: ["hospital-facility-analytics"],
    queryFn: () => apiClient.getHospitalAnalytics(),
  });
  const totals = analyticsQuery.data?.totals || {};
  const topBoughtProducts = analyticsQuery.data?.topBoughtProducts || [];
  const formatMoney = (value) => `KES ${Number(value || 0).toLocaleString()}`;

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
          <Text style={{ fontSize: 24, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Hospital Analytics
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <Donut
            title="Shifts Status"
            theme={theme}
            data={[
              { label: "Created", value: totals.shiftsCreated || 0, color: theme.primary },
              { label: "Completed", value: totals.shiftsCompleted || 0, color: theme.success },
              { label: "Cancelled", value: totals.shiftsCancelled || 0, color: theme.error },
            ]}
          />
          <Donut
            title="Payments"
            theme={theme}
            data={[
              { label: "Paid", value: totals.amountPaid || 0, color: theme.success },
              { label: "Pending", value: totals.pendingAmount || 0, color: theme.warning },
            ]}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 10 }}>
            Shift & Medic Metrics
          </Text>
          <Donut
            flat
            size={100}
            stroke={14}
            title="Shift & Medic Breakdown"
            theme={theme}
            data={[
              { label: "Created", value: totals.shiftsCreated || 0, color: theme.primary },
              { label: "Applied", value: totals.appliedShifts || 0, color: theme.accent },
              { label: "Hired", value: totals.hiredMedics || 0, color: theme.success },
              { label: "Completed", value: totals.shiftsCompleted || 0, color: "#14B8A6" },
              { label: "Cancelled", value: totals.shiftsCancelled || 0, color: theme.error },
            ]}
          />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Shifts created: {totals.shiftsCreated || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Applied shifts: {totals.appliedShifts || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Medics hired: {totals.hiredMedics || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Completed shifts: {totals.shiftsCompleted || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Cancelled shifts: {totals.shiftsCancelled || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Hours total/completed/remaining: {totals.totalShiftHours || 0}/{totals.completedShiftHours || 0}/{totals.hoursRemaining || 0}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 10 }}>
            Finance Metrics
          </Text>
          <View style={{ marginBottom: 10 }}>
            <Donut
              size={120}
              stroke={16}
              title="Finance Breakdown"
              theme={theme}
              data={[
                { label: "Paid", value: totals.amountPaid || 0, color: theme.success },
                { label: "Pending", value: totals.pendingAmount || 0, color: theme.warning },
              ]}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Amount paid: {formatMoney(totals.amountPaid)}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Pending payments: {totals.pendingPayments || 0} ({formatMoney(totals.pendingAmount)})
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Total amount to pay: {formatMoney(totals.totalAmountToPay)}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 10 }}>
            Inventory & Sales
          </Text>
          <View style={{ marginBottom: 10 }}>
            <Donut
              size={120}
              stroke={16}
              title="Inventory Breakdown"
              theme={theme}
              data={[
                { label: "Created", value: totals.totalProducts || 0, color: theme.primary },
                { label: "Sold", value: totals.soldProducts || 0, color: theme.success },
                { label: "Revenue", value: totals.salesRevenue || 0, color: theme.warning },
              ]}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Products created: {totals.totalProducts || 0}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Sold products: {totals.soldProducts || 0}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
            Sales revenue: {formatMoney(totals.salesRevenue)}
          </Text>

          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 6 }}>
            Most Bought Products
          </Text>
          {topBoughtProducts.length ? (
            topBoughtProducts.slice(0, 8).map((item) => (
              <View
                key={`${item.productId}-${item.productName}`}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    backgroundColor: theme.surface,
                    marginRight: 8,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.imageUrl || item.image || item.photoUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(item.imageUrl || item.image || item.photoUrl) }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Package color={theme.iconColor} size={12} />
                  )}
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }}>
                  {item.productName}: {item.quantity}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              No sold products yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
