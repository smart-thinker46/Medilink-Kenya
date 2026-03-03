import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  CreditCard,
  ShoppingCart,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import { resolveMediaUrl } from "@/utils/media";

export default function HospitalInventoryPosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const hospitalTenantId = auth?.tenantId || auth?.tenant?.id || null;
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("intasend");
  const [customerPhone, setCustomerPhone] = useState(auth?.user?.phone || "");

  const productsQuery = useQuery({
    queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
    queryFn: () => apiClient.getHospitalInventoryProducts(hospitalTenantId),
    enabled: Boolean(hospitalTenantId),
  });
  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiClient.getPaymentMethods(),
  });
  const methods = methodsQuery.data || [];

  const products = productsQuery.data || [];
  const filtered = products.filter((product) => {
    const text = `${product.name || product.productName || ""} ${product.category || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const getStock = (product) =>
    Number(product.stock ?? product.numberInStock ?? product.quantity ?? 0);

  const trackPosEvent = (type, payload = {}) => {
    if (!hospitalTenantId || !type) return;
    apiClient
      .trackPharmacyEvent(hospitalTenantId, {
        type,
        productId: payload.productId,
        metadata: payload.metadata || {},
      })
      .catch(() => undefined);
  };

  const addToCart = (product) => {
    if (!isProfileComplete) {
      showToast("Complete hospital profile before selling.", "warning");
      return;
    }
    const stock = getStock(product);
    if (stock <= 0) {
      showToast("Out of stock.", "warning");
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= stock) {
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
      trackPosEvent("CART_ADD", {
        productId: product.id,
        metadata: {
          quantity: existing.quantity + 1,
          source: "hospital_pos",
        },
      });
      return;
    }
    setCart((prev) => [...prev, { ...product, quantity: 1 }]);
    trackPosEvent("CART_ADD", {
      productId: product.id,
      metadata: {
        quantity: 1,
        source: "hospital_pos",
      },
    });
  };

  const removeFromCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (!existing) return;
    trackPosEvent("CART_REMOVE", {
      productId: product.id,
      metadata: {
        quantity: Math.max(0, Number(existing.quantity || 1) - 1),
        source: "hospital_pos",
      },
    });
    if (existing.quantity <= 1) {
      setCart((prev) => prev.filter((item) => item.id !== product.id));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity - 1 }
          : item,
      ),
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const checkout = async () => {
    if (!hospitalTenantId) {
      showToast("Hospital tenant not found.", "error");
      return;
    }
    if (!isProfileComplete) {
      showToast("Complete hospital profile before selling.", "warning");
      return;
    }
    if (!cart.length) {
      showToast("Add products to cart first.", "warning");
      return;
    }
    try {
      const order = await apiClient.createOrder({
        pharmacyId: hospitalTenantId,
        patientId: auth?.user?.id,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name || item.productName,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          prescriptionRequired: Boolean(
            item.prescriptionRequired ?? item.requiresPrescription,
          ),
        })),
        total,
        notes: "Hospital inventory POS sale",
      });

      if (paymentMethod) {
        await apiClient.createPayment({
          amount: total,
          currency: "KES",
          method: paymentMethod,
          type: "ORDER",
          orderId: order?.id,
          recipientId: auth?.user?.id,
          recipientRole: "HOSPITAL_ADMIN",
          phone: customerPhone || auth?.user?.phone,
          description: "Hospital inventory sale payment",
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-products", hospitalTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
      });

      setCart([]);
      showToast("Sale completed successfully.", "success");
    } catch (error) {
      showToast(error.message || "Checkout failed.", "error");
    }
  };

  return (
    <ScreenLayout>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/(app)/(hospital)/inventory-products")}
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
            Hospital POS
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. POS unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Search color={theme.iconColor} size={16} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search inventory products"
              placeholderTextColor={theme.textSecondary}
              style={{ color: theme.text, flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id || `inv-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 180 }}
          renderItem={({ item }) => {
            const cartItem = cart.find((entry) => entry.id === item.id);
            const qty = cartItem?.quantity || 0;
            return (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {(item.imageUrl || item.image) ? (
                  <View
                    style={{
                      width: "100%",
                      height: 100,
                      borderRadius: 10,
                      overflow: "hidden",
                      marginBottom: 8,
                      backgroundColor: theme.surface,
                    }}
                  >
                    <Image
                      source={{ uri: resolveMediaUrl(item.imageUrl || item.image || item.photoUrl) }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {item.name || item.productName}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Stock: {getStock(item)} • Price: KES {Number(item.price || 0)}
                </Text>
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
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
                      onPress={() => removeFromCart(item)}
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
            <View style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16 }}>
              <Text style={{ color: theme.textSecondary }}>
                No products in inventory.
              </Text>
            </View>
          )}
        />

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
            padding: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <ShoppingCart color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, color: theme.text }}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) • KES{" "}
              {total.toFixed(2)}
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
              Customer Phone Number (optional)
            </Text>
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholder="Customer phone number"
              placeholderTextColor={theme.textSecondary}
              style={{ color: theme.text, paddingVertical: 10 }}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: cart.length ? theme.primary : theme.border,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
            onPress={checkout}
            disabled={!cart.length}
          >
            <CreditCard color="#FFFFFF" size={16} />
            <Text style={{ color: "#FFFFFF", marginLeft: 6, fontFamily: "Inter_600SemiBold" }}>
              Checkout Sale
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
