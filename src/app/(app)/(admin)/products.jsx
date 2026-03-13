import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Building2, Store } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

const SELLER_FILTERS = [
  { id: "all", label: "All" },
  { id: "pharmacy", label: "Pharmacies" },
  { id: "hospital", label: "Hospitals" },
];

const normalizeSeller = (value) => String(value || "").trim().toUpperCase();

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("all");

  const productsQuery = useQuery({
    queryKey: ["admin-products", search, sellerFilter],
    queryFn: () =>
      apiClient.adminGetProducts({
        search: search || undefined,
        sellerType: sellerFilter !== "all" ? sellerFilter : undefined,
      }),
  });

  const products = productsQuery.data?.products || [];

  const summary = useMemo(() => {
    const counts = { pharmacies: 0, hospitals: 0 };
    products.forEach((product) => {
      const type = normalizeSeller(product?.sellerType || product?.seller?.type);
      if (type === "HOSPITAL") counts.hospitals += 1;
      else counts.pharmacies += 1;
    });
    return counts;
  }, [products]);

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
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 14,
          }}
        >
          Products Marketplace
        </Text>

        <TextInput
          placeholder="Search products or sellers"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.text,
            fontFamily: "Inter_400Regular",
            marginBottom: 12,
          }}
        />

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {SELLER_FILTERS.map((filter) => {
            const active = sellerFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setSellerFilter(filter.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? `${theme.primary}22` : theme.surface,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: active ? theme.primary : theme.textSecondary,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderTopWidth: isDark ? 0 : 1.5,
              borderTopColor: isDark ? theme.border : theme.accent,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Pharmacy listings</Text>
            <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: theme.text }}>
              {summary.pharmacies}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderTopWidth: isDark ? 0 : 1.5,
              borderTopColor: isDark ? theme.border : theme.accent,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Hospital listings</Text>
            <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: theme.text }}>
              {summary.hospitals}
            </Text>
          </View>
        </View>

        {productsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} size="large" />
        ) : products.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>
            No products found for the current filter.
          </Text>
        ) : (
          products.map((product) => {
            const sellerType = normalizeSeller(product?.sellerType || product?.seller?.type);
            const isHospital = sellerType === "HOSPITAL";
            const Icon = isHospital ? Building2 : Store;
            return (
              <View
                key={product.id}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Icon color={isHospital ? theme.success : theme.primary} size={18} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      marginLeft: 8,
                    }}
                  >
                    {product?.name || product?.productName || "Product"}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Seller: {product?.seller?.name || "Unknown"} ({isHospital ? "Hospital" : "Pharmacy"})
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Category: {product?.category || "General"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Price: KES {Number(product?.price || 0).toFixed(2)}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Stock: {product?.stock ?? product?.numberInStock ?? product?.quantity ?? 0}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
