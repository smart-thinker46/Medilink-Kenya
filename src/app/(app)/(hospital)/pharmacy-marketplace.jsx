import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pill,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { resolveMediaUrl } from "@/utils/media";

export default function HospitalPharmacyMarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("intasend");
  const [phoneNumber, setPhoneNumber] = useState(auth?.user?.phone || "");

  const marketplaceQuery = useQuery({
    queryKey: ["hospital-pharmacy-marketplace", searchQuery],
    queryFn: () =>
      apiClient.getPharmacyMarketplace({
        search: searchQuery || undefined,
      }),
  });
  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiClient.getPaymentMethods(),
  });

  const methods = methodsQuery.data || [];
  const products = useMemo(() => {
    const raw = marketplaceQuery.data?.products || [];
    return raw.map((product) => ({
      id: product.id,
      name: product.name || "Product",
      pharmacyName: product.pharmacy?.name || "Pharmacy",
      pharmacyId: product.pharmacyId || product.pharmacy?.id || null,
      imageUrl: product.imageUrl || product.image || product.photoUrl || null,
      price: Number(product.price) || 0,
      stock: Number(product.stock ?? product.quantity ?? 0),
      category: product.category || "",
      description: product.description || "",
      prescriptionRequired: Boolean(
        product.prescriptionRequired ?? product.requiresPrescription,
      ),
    }));
  }, [marketplaceQuery.data]);

  const trackMarketplaceEvent = (pharmacyId, type, payload = {}) => {
    if (!pharmacyId || !type) return;
    apiClient
      .trackPharmacyEvent(pharmacyId, {
        type,
        productId: payload.productId,
        metadata: payload.metadata || {},
      })
      .catch(() => undefined);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast("Product is out of stock.", "warning");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        showToast("Cannot exceed available stock.", "warning");
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
      trackMarketplaceEvent(product.pharmacyId, "CART_ADD", {
        productId: product.id,
        metadata: {
          quantity: existing.quantity + 1,
          source: "hospital_marketplace",
        },
      });
      return;
    }

    setCart((prev) => [...prev, { ...product, quantity: 1 }]);
    trackMarketplaceEvent(product.pharmacyId, "CART_ADD", {
      productId: product.id,
      metadata: {
        quantity: 1,
        source: "hospital_marketplace",
      },
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (!existing) return prev;
      if (existing?.pharmacyId) {
        trackMarketplaceEvent(existing.pharmacyId, "CART_REMOVE", {
          productId,
          metadata: {
            quantity: Math.max(0, Number(existing.quantity || 1) - 1),
            source: "hospital_marketplace",
          },
        });
      }
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
      );
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const checkout = async () => {
    if (!cart.length) {
      showToast("Add products to cart first.", "warning");
      return;
    }
    try {
      const groupedByPharmacy = cart.reduce((acc, item) => {
        const key = item.pharmacyId || "__unknown__";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      const pharmacyIds = Object.keys(groupedByPharmacy).filter(
        (id) => id && id !== "__unknown__",
      );
      if (!pharmacyIds.length) {
        showToast("Unable to identify pharmacy for checkout.", "error");
        return;
      }

      for (const pharmacyId of pharmacyIds) {
        const items = groupedByPharmacy[pharmacyId] || [];
        const pharmacyTotal = items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
          0,
        );

        const order = await apiClient.createOrder({
          pharmacyId,
          patientId: auth?.user?.id,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price) || 0,
            prescriptionRequired: Boolean(item.prescriptionRequired),
          })),
          total: pharmacyTotal,
          notes: "Hospital order from pharmacy marketplace",
        });

        if (paymentMethod) {
          await apiClient.createPayment({
            amount: pharmacyTotal,
            currency: "KES",
            method: paymentMethod,
            type: "ORDER",
            orderId: order?.id,
            recipientId: auth?.user?.id,
            recipientRole: "HOSPITAL_ADMIN",
            phone: phoneNumber || auth?.user?.phone,
            description: "Hospital medicine purchase",
          });
        }
      }

      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["hospital-pharmacy-marketplace"] });
      showToast("Orders placed successfully.", "success");
    } catch (error) {
      showToast(error.message || "Checkout failed. Please try again.", "error");
    }
  };

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
            onPress={() => router.replace("/(app)/(hospital)/pharmacy")}
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
            Buy Medicines
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
          }}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search medicine"
            placeholderTextColor={theme.textSecondary}
            style={{ color: theme.text }}
          />
        </View>

        {marketplaceQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 180 }}
            renderItem={({ item }) => {
              const cartItem = cart.find((entry) => entry.id === item.id);
              const qty = cartItem?.quantity || 0;
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
                  {item.imageUrl ? (
                    <View
                      style={{
                        width: "100%",
                        height: 110,
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 10,
                        backgroundColor: theme.surface,
                      }}
                    >
                      <Image
                        source={{ uri: resolveMediaUrl(item.imageUrl) }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Pill color={theme.primary} size={16} />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 15,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Pharmacy: {item.pharmacyName}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Price: KES {item.price}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Stock: {item.stock}
                  </Text>
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      In cart: {qty}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: theme.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Minus color={theme.iconColor} size={14} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: theme.primary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => addToCart(item)}
                      >
                        <Plus color="#FFFFFF" size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <Text style={{ color: theme.textSecondary }}>No products found.</Text>
              </View>
            )}
          />
        )}

        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 10,
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <ShoppingCart color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text }}>
              {totalItems} item(s) • KES {totalAmount.toFixed(2)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {methods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    paymentMethod === method.id ? theme.primary : theme.border,
                  backgroundColor:
                    paymentMethod === method.id ? `${theme.primary}20` : theme.surface,
                }}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Text
                  style={{
                    color:
                      paymentMethod === method.id ? theme.primary : theme.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {method.name || method.id}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={{
              backgroundColor: `${theme.primary}10`,
              borderRadius: 12,
              paddingHorizontal: 12,
              marginBottom: 8,
              borderWidth: 2,
              borderColor: theme.primary,
            }}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                marginTop: 8,
              }}
            >
              Checkout Phone Number (optional)
            </Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor={theme.textSecondary}
              style={{ color: theme.text, paddingVertical: 10 }}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: totalItems ? theme.primary : theme.border,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
            onPress={checkout}
            disabled={!totalItems}
          >
            <CreditCard color="#FFFFFF" size={16} />
            <Text style={{ color: "#FFFFFF", marginLeft: 6, fontFamily: "Inter_600SemiBold" }}>
              Checkout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
