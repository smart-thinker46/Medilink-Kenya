import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  CreditCard,
  ScanLine,
  X,
  ShoppingCart,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { getPharmacyProfileCompletion } from "@/utils/pharmacyProfileCompletion";
import { resolveMediaUrl } from "@/utils/media";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

export default function PharmacyPosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { profile } = usePharmacyProfile();
  const completion = useMemo(
    () => getPharmacyProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const paymentMethod = "intasend";
  const [currency, setCurrency] = useState("KES");
  const [customerPhone, setCustomerPhone] = useState("");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [paymentMode, setPaymentMode] = useState("mobile");
  const [showCartPanel, setShowCartPanel] = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const queryClient = useQueryClient();

  const { auth } = useAuthStore();
  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();

  const productsQuery = useQuery({
    queryKey: ["pharmacy-products", pharmacyId, "pos"],
    queryFn: () => apiClient.getProducts(pharmacyId),
    enabled: Boolean(pharmacyId),
  });
  const ratesQuery = useQuery({
    queryKey: ["payment-rates"],
    queryFn: () => apiClient.getPaymentRates(),
  });
  const usdKesRate = Number(ratesQuery.data?.USD_KES || 150);

  const products = productsQuery.data || [];

  const filtered = products.filter((p) => {
    const lookup = `${p.name || p.productName || ""} ${p.category || ""} ${p.sku || ""} ${p.barcode || ""}`.toLowerCase();
    return lookup.includes(query.toLowerCase());
  });

  const getAvailableStock = (product) =>
    Number(product?.stock ?? product?.numberInStock ?? product?.quantity ?? 0);

  const trackPosEvent = (type, payload = {}) => {
    if (!pharmacyId || !type) return;
    apiClient
      .trackPharmacyEvent(pharmacyId, {
        type,
        productId: payload.productId,
        metadata: payload.metadata || {},
      })
      .catch(() => undefined);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (!data || data === lastScannedCode) return;
    setLastScannedCode(data);
    setQuery(data);
    const found = (products || []).find((item) => {
      const sku = String(item.sku || item.barcode || "").trim().toLowerCase();
      const code = String(data).trim().toLowerCase();
      return sku && sku === code;
    });

    if (found) {
      addToCart(found);
      showToast(`Added ${found.name || found.productName}.`, "success");
      setScannerVisible(false);
      return;
    }

    showToast("No product found for this code.", "warning");
  };

  const addToCart = (product) => {
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before selling products.",
        "warning",
      );
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    const availableStock = getAvailableStock(product);

    if (availableStock <= 0) {
      showToast("Out of stock.", "warning");
      return;
    }

    if (existing) {
      if (existing.quantity >= availableStock) {
        showToast("Cannot exceed available stock.", "warning");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
      trackPosEvent("CART_ADD", {
        productId: product.id,
        metadata: {
          quantity: existing.quantity + 1,
          source: "pharmacy_pos",
        },
      });
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      trackPosEvent("CART_ADD", {
        productId: product.id,
        metadata: {
          quantity: 1,
          source: "pharmacy_pos",
        },
      });
    }
  };

  const removeFromCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (!existing) return;
    trackPosEvent("CART_REMOVE", {
      productId: product.id,
      metadata: {
        quantity: Math.max(0, Number(existing.quantity || 1) - 1),
        source: "pharmacy_pos",
      },
    });
    if (existing.quantity === 1) {
      setCart(cart.filter((item) => item.id !== product.id));
    } else {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      );
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const handleCheckout = async () => {
    if (!pharmacyId) {
      showToast("Pharmacy tenant not found for this account.", "error");
      return;
    }
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before processing sales.",
        "warning",
      );
      return;
    }
    try {
      if (cart.length === 0) {
        showToast("Add products to cart first.", "warning");
        return;
      }

      const stockErrors = cart.filter((item) => item.quantity > getAvailableStock(item));
      if (stockErrors.length > 0) {
        showToast("Some items exceed current stock. Refresh and try again.", "warning");
        return;
      }

      const order = await apiClient.createOrder({
        items: cart.map((item) => ({
          id: item.id,
          name: item.name || item.productName,
          price: Number(item.price) || 0,
          quantity: item.quantity,
          prescriptionRequired: Boolean(
            item.prescriptionRequired ?? item.requiresPrescription ?? item.prescription,
          ),
        })),
        total,
      });
      if (paymentMode === "cash") {
        await apiClient.request(`/orders/${order?.id}`, {
          method: "PUT",
          body: JSON.stringify({
            status: "PAID",
            paymentStatus: "COMPLETED",
            paymentMethod: "CASH",
            paidAt: new Date().toISOString(),
          }),
        });
        await apiClient.createPayment({
          amount: total,
          currency,
          method: "cash",
          type: "ORDER",
          orderId: order?.id,
          recipientId: auth?.user?.id,
          recipientRole: "PHARMACY_ADMIN",
          phone: customerPhone || auth?.user?.phone,
          description: "Pharmacy order payment (cash)",
          openCheckout: false,
        });
      } else {
        await apiClient.createPayment({
          amount: total,
          currency,
          method: paymentMethod,
          type: "ORDER",
          orderId: order?.id,
          recipientId: auth?.user?.id,
          recipientRole: "PHARMACY_ADMIN",
          phone: customerPhone || auth?.user?.phone,
          description: "Pharmacy order payment",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["pharmacy-products", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-products", pharmacyId, "pos"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stock-movements", pharmacyId] });
      setCart([]);
      showToast(
        paymentMode === "cash"
          ? "Order completed with cash payment."
          : "Order created successfully.",
        "success",
      );
    } catch (error) {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Checkout failed. Please try again.", "error");
    }
  };

  const renderCartPanel = (compact = false) => (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
        Checkout
      </Text>
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
        Select payment method for this sale.
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        {[
          { label: "Mobile (IntaSend)", value: "mobile" },
          { label: "Cash", value: "cash" },
        ].map((option) => {
          const active = paymentMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? `${theme.primary}15` : theme.surface,
                alignItems: "center",
              }}
              onPress={() => setPaymentMode(option.value)}
            >
              <Text style={{ fontSize: 12, color: active ? theme.primary : theme.textSecondary }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        {["KES", "USD"].map((code) => (
          <TouchableOpacity
            key={code}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 14,
              backgroundColor: currency === code ? `${theme.primary}20` : theme.surface,
              borderWidth: 1,
              borderColor: currency === code ? theme.primary : theme.border,
            }}
            onPress={() => setCurrency(code)}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: currency === code ? theme.primary : theme.textSecondary,
                textAlign: "center",
              }}
            >
              {code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currency === "USD" && paymentMode === "mobile" && (
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
          IntaSend checkout will use 1 USD ≈ {usdKesRate} KES.
        </Text>
      )}

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
          Customer Phone (optional)
        </Text>
        <TextInput
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="07xx xxx xxx"
          keyboardType="phone-pad"
          placeholderTextColor={theme.textTertiary}
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.text,
            borderWidth: 1,
            borderColor: theme.border,
            opacity: paymentMode === "cash" ? 0.6 : 1,
          }}
          editable={paymentMode !== "cash"}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        {cart.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Cart is empty. Add items from the list.
          </Text>
        ) : (
          cart.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: theme.text,
                  flex: 1,
                  marginRight: 10,
                }}
              >
                {(item.name || item.productName)} x{item.quantity}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 6,
                  }}
                  onPress={() => removeFromCart(item)}
                >
                  <Minus color={theme.textSecondary} size={14} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  KES {item.price * item.quantity}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
          }}
        >
          Total
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Inter_700Bold",
            color: theme.text,
          }}
        >
          KES {total}
        </Text>
      </View>

      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: theme.primary,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          opacity: cart.length === 0 ? 0.6 : 1,
        }}
        onPress={handleCheckout}
        disabled={cart.length === 0}
      >
        <CreditCard color="#FFFFFF" size={16} />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: "#FFFFFF",
            marginLeft: 6,
          }}
        >
          Checkout
        </Text>
      </TouchableOpacity>
    </View>
  );

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
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Pharmacy POS
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

        <View
          style={{
            flex: 1,
            flexDirection: Platform.OS === "web" ? "row" : "column",
            paddingHorizontal: 24,
            gap: Platform.OS === "web" ? 16 : 0,
          }}
        >
          <View style={{ flex: 1 }}>
            <PharmacyScopeSelector
              visible={isSuperAdmin}
              pharmacies={pharmacies}
              selectedPharmacyId={pharmacyId}
              onSelect={setSelectedPharmacyTenantId}
              loading={isLoadingScope}
            />

            {completion.percent < 100 && (
              <ProfileRequiredBanner
                percent={completion.percent}
                message={`Profile completion is ${completion.percent}%. POS unlocks at 99%.`}
                onComplete={() => router.push("/(app)/(pharmacy)/edit-profile")}
              />
            )}

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
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.card,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    marginLeft: 8,
                  }}
                  onPress={async () => {
                    if (Platform.OS === "web") {
                      showToast("Barcode scanner is available on mobile.", "info");
                      return;
                    }
                    if (!cameraPermission?.granted) {
                      const response = await requestCameraPermission();
                      if (!response.granted) {
                        showToast("Camera permission is required to scan barcodes.", "warning");
                        return;
                      }
                    }
                    setLastScannedCode("");
                    setScannerVisible(true);
                  }}
                >
                  <ScanLine color={theme.iconColor} size={16} />
                </TouchableOpacity>
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
                      Stock {getAvailableStock(item)}
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
            />
          </View>

          {Platform.OS === "web" && showCartPanel && (
            <View style={{ width: 320 }}>
              {renderCartPanel(true)}
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

        <Modal visible={scannerVisible} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <View
              style={{
                paddingTop: insets.top + 12,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontFamily: "Nunito_700Bold" }}>
                Scan Product Barcode
              </Text>
              <TouchableOpacity onPress={() => setScannerVisible(false)}>
                <X color="#FFFFFF" size={22} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginTop: 16 }}>
              {cameraPermission?.granted ? (
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#FFFFFF" }}>Camera permission not granted.</Text>
                </View>
              )}
            </View>
            <View style={{ padding: 18 }}>
              <Text style={{ color: "#FFFFFF", textAlign: "center", opacity: 0.85 }}>
                Point camera at SKU/barcode to add product instantly.
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
}
