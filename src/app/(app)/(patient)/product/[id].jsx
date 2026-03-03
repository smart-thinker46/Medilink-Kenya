import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Pill, MapPin, Star } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { resolveMediaUrl } from "@/utils/media";

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams();
  const productId = params?.id;

  const productQuery = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: () => apiClient.getProductById(productId),
    enabled: Boolean(productId),
  });

  const product = productQuery.data;
  const pharmacy = product?.pharmacy;
  const rating = product?.rating || 4.6;
  const trackedProductIdRef = useRef(null);

  useEffect(() => {
    if (!product) return;
    const pharmacyId = product?.pharmacyId || product?.pharmacy?.id;
    const normalizedProductId = String(product?.id || "");
    if (!pharmacyId || !normalizedProductId) return;
    if (trackedProductIdRef.current === normalizedProductId) return;

    trackedProductIdRef.current = normalizedProductId;
    apiClient
      .trackPharmacyEvent(pharmacyId, {
        type: "PRODUCT_VIEW",
        productId: normalizedProductId,
        metadata: {
          productName: product?.name || null,
          category: product?.category || null,
          source: "patient_product_detail",
        },
      })
      .catch(() => undefined);
  }, [product]);

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
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Product Details
          </Text>
        </View>

        {productQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : productQuery.isError || !product ? (
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_500Medium",
                color: theme.textSecondary,
              }}
            >
              Unable to load product details.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  overflow: "hidden",
                }}
              >
                {product.imageUrl || product.image || product.photoUrl ? (
                  <Image
                    source={{ uri: resolveMediaUrl(product.imageUrl || product.image || product.photoUrl) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Pill color={theme.primary} size={40} />
                )}
              </View>

              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {product.name}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 12,
                }}
              >
                {product.description || "Product details from the pharmacy."}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Star color="#FFD700" size={14} fill="#FFD700" />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: theme.text,
                    marginLeft: 6,
                  }}
                >
                  {rating}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  ({product.reviews || 0} reviews)
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Inter_700Bold",
                  color: theme.text,
                }}
              >
                KES {product.price || 0}
              </Text>
              {product.discount ? (
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.success,
                    marginTop: 6,
                  }}
                >
                  {product.discount}% off
                </Text>
              ) : null}
            </View>

            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 10,
                }}
              >
                Pharmacy
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_500Medium",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {pharmacy?.name || "Pharmacy"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MapPin color={theme.primary} size={14} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  {pharmacy?.location?.name ||
                    pharmacy?.location ||
                    "Location not set"}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
