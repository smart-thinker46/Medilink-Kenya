import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, ArrowDown, ArrowUp, Edit3, Trash2 } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

const movementColor = (type, theme) => {
  if (type === "RESTOCK" || type === "CREATED") return theme.success;
  if (type === "SALE") return theme.warning;
  if (type === "DELETED") return theme.error;
  return theme.primary;
};

const movementIcon = (type) => {
  if (type === "RESTOCK" || type === "CREATED") return ArrowUp;
  if (type === "SALE") return ArrowDown;
  if (type === "DELETED") return Trash2;
  return Edit3;
};

export default function StockMovementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();
  const [query, setQuery] = useState("");

  const movementsQuery = useQuery({
    queryKey: ["pharmacy-stock-movements", pharmacyId],
    queryFn: () => apiClient.getPharmacyStockMovements(pharmacyId),
    enabled: Boolean(pharmacyId),
  });

  const movements = movementsQuery.data || [];
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return movements;
    return movements.filter((item) =>
      `${item.productName || ""} ${item.type || ""} ${item.reason || ""}`
        .toLowerCase()
        .includes(search),
    );
  }, [movements, query]);

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 16,
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
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Stock History
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <PharmacyScopeSelector
            visible={isSuperAdmin}
            pharmacies={pharmacies}
            selectedPharmacyId={pharmacyId}
            onSelect={setSelectedPharmacyTenantId}
            loading={isLoadingScope}
          />
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 14,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Search color={theme.iconColor} size={16} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search movements"
              placeholderTextColor={theme.textSecondary}
              style={{
                flex: 1,
                marginLeft: 8,
                color: theme.text,
                fontSize: 14,
              }}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const tint = movementColor(item.type, theme);
            const Icon = movementIcon(item.type);
            return (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: `${tint}20`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Icon color={tint} size={14} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                      {item.productName || "Product"}
                    </Text>
                    <Text style={{ fontSize: 11, color: tint }}>
                      {item.type || "UPDATED"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {item.reason || "Stock updated"}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                  Change: {item.quantityChange > 0 ? `+${item.quantityChange}` : item.quantityChange || 0}
                  {" • "}
                  {item.stockBefore ?? 0} → {item.stockAfter ?? 0}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                No stock movement records yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
