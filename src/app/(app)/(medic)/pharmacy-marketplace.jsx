import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pill, Plus, Minus, ShoppingCart, CreditCard } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { resolveMediaUrl } from "@/utils/media";

export default function MedicPharmacyMarketplaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();

  const isWeb = Platform.OS === "web";
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const paymentMethod = "intasend";
  const [phoneNumber, setPhoneNumber] = useState(auth?.user?.phone || "");

  const pharmacyIdParam = Array.isArray(params?.pharmacyId)
    ? params.pharmacyId[0]
    : params?.pharmacyId;
  const scopedPharmacyId =
    typeof pharmacyIdParam === "string" && pharmacyIdParam.trim().length > 0
      ? pharmacyIdParam.trim()
      : "";

  const marketplaceQuery = useQuery({
    queryKey: ["medic-pharmacy-marketplace", searchQuery, scopedPharmacyId],
    queryFn: () =>
      apiClient.getPharmacyMarketplace({
        search: searchQuery || undefined,
      }),
  });
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
  const visibleProducts = useMemo(
    () =>
      scopedPharmacyId
        ? products.filter((product) => String(product.pharmacyId || "") === scopedPharmacyId)
        : products,
    [products, scopedPharmacyId],
  );

  const totalPages = useMemo(
    () => (isWeb ? Math.max(1, Math.ceil(visibleProducts.length / pageSize)) : 1),
    [visibleProducts.length, isWeb],
  );

  useEffect(() => {
    if (!isWeb) return;
    if (page > totalPages) {
      setPage(totalPages);
    } else if (page < 1) {
      setPage(1);
    }
  }, [page, totalPages, isWeb]);

  useEffect(() => {
    if (!isWeb || totalPages <= 1) return;
    const handleKey = (event) => {
      if (event.key === "ArrowLeft") {
        setPage((prev) => Math.max(1, prev - 1));
      }
      if (event.key === "ArrowRight") {
        setPage((prev) => Math.min(totalPages, prev + 1));
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isWeb, totalPages]);

  const pagedProducts = isWeb
    ? visibleProducts.slice((page - 1) * pageSize, page * pageSize)
    : visibleProducts;

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
          source: "medic_marketplace",
        },
      });
      return;
    }

    setCart((prev) => [...prev, { ...product, quantity: 1 }]);
    trackMarketplaceEvent(product.pharmacyId, "CART_ADD", {
      productId: product.id,
      metadata: {
        quantity: 1,
        source: "medic_marketplace",
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
            source: "medic_marketplace",
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
          notes: "Medic order from pharmacy marketplace",
        });

        await apiClient.createPayment({
          amount: pharmacyTotal,
          currency: "KES",
          method: paymentMethod,
          type: "ORDER",
          orderId: order?.id,
          recipientId: pharmacyId,
          recipientRole: "PHARMACY_ADMIN",
          phone: phoneNumber || auth?.user?.phone,
          description: "Medic medicine/equipment purchase",
        });
      }

      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["medic-pharmacy-marketplace"] });
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
            onPress={() => router.replace("/(app)/(medic)")}
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
            Buy Medicines & Equipment
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
            placeholder="Search medicines or equipment (e.g. syringes)"
            placeholderTextColor={theme.textSecondary}
            style={{ color: theme.text }}
          />
        </View>
        {scopedPharmacyId ? (
          <View
            style={{
              backgroundColor: `${theme.primary}15`,
              borderColor: `${theme.primary}44`,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
              Pharmacy scope is active for this view.
            </Text>
          </View>
        ) : null}

        {marketplaceQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={pagedProducts}
            keyExtractor={(item) => item.id}
            style={{ width: "100%" }}
            contentContainerStyle={{
              paddingBottom: 180,
              ...(isWeb
                ? {
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "stretch",
                    justifyContent: "flex-start",
                    columnGap: 16,
                    rowGap: 16,
                    width: "100%",
                  }
                : null),
            }}
            renderItem={({ item }) => {
              const cartItem = cart.find((entry) => entry.id === item.id);
              const qty = cartItem?.quantity || 0;
              return (
                <View
                  style={{
                    width: isWeb ? "25%" : "100%",
                    padding: isWeb ? 12 : 0,
                    flexBasis: isWeb ? "25%" : undefined,
                    maxWidth: isWeb ? 300 : "100%",
                    minWidth: isWeb ? 220 : undefined,
                    flexGrow: isWeb ? 1 : 0,
                    backgroundColor: theme.card,
                    borderRadius: 14,
                    padding: isWeb ? 18 : 14,
                    marginBottom: isWeb ? 0 : 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    minHeight: isWeb ? 320 : undefined,
                  }}
                >
                  {item.imageUrl ? (
                    <View
                      style={{
                        width: "100%",
                        height: isWeb ? 160 : 110,
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
        {isWeb && totalPages > 1 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: page <= 1 ? theme.surface : theme.card,
                opacity: page <= 1 ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Previous</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {(() => {
                const maxButtons = 7;
                const half = Math.floor(maxButtons / 2);
                let start = Math.max(1, page - half);
                let end = Math.min(totalPages, start + maxButtons - 1);
                if (end - start + 1 < maxButtons) {
                  start = Math.max(1, end - maxButtons + 1);
                }
                const pages = [];
                for (let i = start; i <= end; i += 1) pages.push(i);
                return pages.map((pg) => {
                  const active = pg === page;
                  return (
                    <TouchableOpacity
                      key={`page-${pg}`}
                      onPress={() => setPage(pg)}
                      style={{
                        minWidth: 28,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? `${theme.primary}22` : theme.card,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.primary : theme.textSecondary,
                          fontSize: 12,
                          textAlign: "center",
                        }}
                      >
                        {pg}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
            <TouchableOpacity
              onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: page >= totalPages ? theme.surface : theme.card,
                opacity: page >= totalPages ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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

          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>
            Payments are processed via IntaSend.
          </Text>

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
