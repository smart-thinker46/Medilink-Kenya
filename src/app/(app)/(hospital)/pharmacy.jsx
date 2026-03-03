import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ShoppingBag, PackageSearch, Store } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";

export default function HospitalPharmacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.replace("/(app)/(hospital)")}
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
            Pharmacy Hub
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => router.push("/(app)/(hospital)/pharmacy-marketplace")}
          >
            <ShoppingBag color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Buy medicines from listed pharmacies
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => router.push("/(app)/(hospital)/inventory-products")}
          >
            <PackageSearch color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Sell medicines from hospital inventory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => router.push("/(app)/(hospital)/inventory-pos")}
          >
            <Store color={theme.primary} size={18} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginLeft: 8,
              }}
            >
              Hospital pharmacy POS (sell/checkout)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
