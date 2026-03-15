import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  CreditCard,
  ShoppingCart,
  ScanLine,
} from "lucide-react-native";
import { MotiView } from "moti";

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
  const { theme } = useAppTheme();
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
  const paymentMethod = "intasend";
  const [customerPhone, setCustomerPhone] = useState(auth?.user?.phone || "");
  const [showCartPanel, setShowCartPanel] = useState(true);

  const productsQuery = useQuery({
    queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
    queryFn: () => apiClient.getHospitalInventoryProducts(hospitalTenantId),
    enabled: Boolean(hospitalTenantId),
  });

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

  const clearCart = () => setCart([]);

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

  const renderCartPanel = () => (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ShoppingCart color={theme.primary} size={16} />
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold" }}>
            Cart ({cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)})
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => clearCart()}
          disabled={!cart.length}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: cart.length ? `${theme.error}15` : theme.surface,
            borderWidth: 1,
            borderColor: cart.length ? `${theme.error}40` : theme.border,
          }}
        >
          <Text style={{ fontSize: 12, color: cart.length ? theme.error : theme.textSecondary }}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {cart.length ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          {cart.map((item) => {
            const qty = Number(item.quantity || 0);
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={1}>
                  {item.name || item.productName}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  KES {Number(item.price || 0)} each
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                  <TouchableOpacity
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => removeFromCart(item)}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ width: 44, textAlign: "center", color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {qty}
                  </Text>
                  <TouchableOpacity
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>+</Text>
                  </TouchableOpacity>
                  <Text style={{ marginLeft: "auto", color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    KES {(Number(item.price || 0) * qty).toFixed(0)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ marginTop: 12, color: theme.textSecondary, fontSize: 12 }}>
          Add products to begin checkout.
        </Text>
      )}

      <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          Payments are processed via IntaSend.
        </Text>
        <View
          style={{
            backgroundColor: `${theme.primary}10`,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginTop: 10,
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

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Total</Text>
          <Text style={{ marginLeft: "auto", color: theme.text, fontFamily: "Inter_700Bold" }}>
            KES {total.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: cart.length ? theme.primary : theme.border,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            marginTop: 12,
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
  );

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
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === "web") {
                setShowCartPanel((prev) => !prev);
              } else {
                showToast("Cart is shown at the bottom.", "info");
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginLeft: "auto",
              borderWidth: 1,
              borderColor: theme.border,
            }}
            activeOpacity={0.8}
          >
            <ShoppingCart color={theme.text} size={18} />
            {cart.length > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                  {cart.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. POS unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <View
          style={{
            flex: 1,
            flexDirection: Platform.OS === "web" ? "row" : "column",
            paddingHorizontal: 24,
            gap: Platform.OS === "web" ? 16 : 0,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 16, marginTop: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.surface,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Search color={theme.iconColor} size={20} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: "Inter_400Regular",
                    color: theme.text,
                    marginLeft: 12,
                  }}
                  placeholder="Search products..."
                  placeholderTextColor={theme.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingBottom: 140,
                ...(Platform.OS === "web"
                  ? {
                      flexDirection: "row",
                      flexWrap: "wrap",
                      alignItems: "stretch",
                      justifyContent: "flex-start",
                      columnGap: 16,
                      rowGap: 16,
                    }
                  : null),
              }}
              renderItem={({ item, index }) => (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 500, delay: index * 60 }}
                  style={{
                    marginBottom: Platform.OS === "web" ? 0 : 12,
                    width: Platform.OS === "web" ? "25%" : "100%",
                    padding: Platform.OS === "web" ? 8 : 0,
                    flexBasis: Platform.OS === "web" ? "25%" : undefined,
                    minWidth: Platform.OS === "web" ? 220 : undefined,
                    maxWidth: Platform.OS === "web" ? 300 : "100%",
                    flexGrow: Platform.OS === "web" ? 1 : 0,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: theme.border,
                      minHeight: Platform.OS === "web" ? 280 : undefined,
                    }}
                  >
                    <View
                      style={{
                        width: "100%",
                        height: Platform.OS === "web" ? 140 : 70,
                        borderRadius: 12,
                        backgroundColor: theme.surface,
                        marginBottom: 12,
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
                        <ScanLine color={theme.iconColor} size={20} />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                      numberOfLines={2}
                    >
                      {item.name || item.productName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      Stock {getStock(item)}
                      {Boolean(item.prescriptionRequired ?? item.requiresPrescription ?? item.prescription)
                        ? " • Prescription"
                        : ""}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_600SemiBold",
                          color: theme.text,
                          flex: 1,
                        }}
                      >
                        KES {item.price}
                      </Text>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: theme.primary,
                        }}
                        onPress={() => addToCart(item)}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </MotiView>
              )}
              ListEmptyComponent={() => (
                <View style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16 }}>
                  <Text style={{ color: theme.textSecondary }}>
                    No products in inventory.
                  </Text>
                </View>
              )}
            />
          </View>

          {Platform.OS === "web" && showCartPanel && (
            <View style={{ width: 320 }}>
              {renderCartPanel()}
            </View>
          )}
        </View>

        {Platform.OS !== "web" && cart.length > 0 && (
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 20,
              left: 24,
              right: 24,
            }}
          >
            {renderCartPanel()}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
