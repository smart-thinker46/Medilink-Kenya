import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import {
  Search,
  ShoppingCart,
  Pill,
  Star,
  MapPin,
  Filter,
  Plus,
  Minus,
  Heart,
  Phone,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import VideoCall from "@/components/VideoCall";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCall } from "@/utils/useVideoCall";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";
import { useCartStore } from "@/utils/cart/store";
import { useToast } from "@/components/ToastProvider";
import { resolveMediaUrl } from "@/utils/media";

export default function PharmacyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { formatCurrency } = useI18n();
  const { showToast } = useToast();
  const prescriptionIdParam = Array.isArray(params?.prescriptionId)
    ? params.prescriptionId[0]
    : params?.prescriptionId;
  const prescriptionId =
    typeof prescriptionIdParam === "string" && prescriptionIdParam.trim().length > 0
      ? prescriptionIdParam.trim()
      : "";
  const pharmacyIdParam = Array.isArray(params?.pharmacyId)
    ? params.pharmacyId[0]
    : params?.pharmacyId;
  const scopedPharmacyId =
    typeof pharmacyIdParam === "string" && pharmacyIdParam.trim().length > 0
      ? pharmacyIdParam.trim()
      : "";
  const pharmacyNameParam = Array.isArray(params?.pharmacyName)
    ? params.pharmacyName[0]
    : params?.pharmacyName;
  const scopedPharmacyName =
    typeof pharmacyNameParam === "string" && pharmacyNameParam.trim().length > 0
      ? pharmacyNameParam.trim()
      : "";

  // Video call integration
  const {
    currentCall,
    incomingCall,
    makePharmacyCall,
    callStatus,
    callDuration,
    endCall,
    answerCall,
    rejectCall,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleHold,
    markCallConnected,
  } = useVideoCall();

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { items: cartItems, addItem, removeItem, load } = useCartStore();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const categories = [
    { id: "all", title: "All" },
    { id: "prescription", title: "Prescription" },
    { id: "otc", title: "Over-the-Counter" },
    { id: "vitamins", title: "Vitamins" },
    { id: "personal_care", title: "Personal Care" },
    { id: "first_aid", title: "First Aid" },
  ];

  const marketplaceQuery = useQuery({
    queryKey: [
      "pharmacy-marketplace",
      searchQuery,
      activeCategory,
      locationFilter,
      scopedPharmacyId,
    ],
    queryFn: () =>
      apiClient.getPharmacyMarketplace({
        search: searchQuery || undefined,
        category: activeCategory !== "all" ? activeCategory : undefined,
        location: locationFilter || undefined,
      }),
  });

  const rawProducts = marketplaceQuery.data?.products || [];
  const products = useMemo(
    () =>
      rawProducts.map((product) => {
        const stock = product.stock ?? product.quantity ?? 0;
        const category = product.category || "otc";
        const pharmacyName = product.pharmacy?.name || "Pharmacy";
        return {
          id: product.id,
          name: product.name || "Product",
          description:
            product.description || `Available at ${pharmacyName}`,
          category,
          price: Number(product.price) || 0,
          originalPrice: Number(product.originalPrice) || Number(product.price) || 0,
          discount: Number(product.discount) || 0,
          rating: Number(product.rating) || 4.5,
          reviews: Number(product.reviews) || 0,
          inStock: stock > 0,
          quantity: stock,
          brand: product.brand || "Generic",
          requiresPrescription: category === "prescription",
          image: product.imageUrl || product.image || product.photoUrl || null,
          pharmacy: pharmacyName,
          pharmacyId: product.pharmacy?.id || product.pharmacyId || product.pharmacy_id,
          pharmacyRating: Number(product.pharmacyRating) || 4.6,
          deliveryTime: product.deliveryTime || (stock > 0 ? "30-45 mins" : "Out of stock"),
        };
      }),
    [rawProducts],
  );

  const locationOptions = useMemo(() => {
    const values = rawProducts
      .map((product) => product.location || product.pharmacyLocation || product.pharmacy)
      .filter(Boolean);
    return [...new Set(values)];
  }, [rawProducts]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || product.category === activeCategory;
    const matchesPharmacy =
      !scopedPharmacyId || String(product.pharmacyId || "") === scopedPharmacyId;
    const pharmacyLocation = String(
      product.location || product.pharmacyLocation || product.pharmacy || "",
    ).toLowerCase();
    const matchesLocation = !locationFilter || pharmacyLocation.includes(locationFilter.toLowerCase());
    return matchesSearch && matchesCategory && matchesLocation && matchesPharmacy;
  });

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
    const existingPharmacy = cartItems[0]?.pharmacyId;
    if (existingPharmacy && product.pharmacyId && existingPharmacy !== product.pharmacyId) {
      showToast("Please checkout this pharmacy before adding items from another.", "warning");
      return;
    }
    const currentQty = getCartItemQuantity(product.id);
    addItem(product);
    trackMarketplaceEvent(product.pharmacyId, "CART_ADD", {
      productId: product.id,
      metadata: {
        productName: product.name,
        quantity: currentQty + 1,
        price: Number(product.price) || 0,
        source: "patient_marketplace",
      },
    });
  };

  const removeFromCart = (productId) => {
    const existingItem = cartItems.find((item) => item.id === productId);
    removeItem(productId);
    if (existingItem?.pharmacyId) {
      trackMarketplaceEvent(existingItem.pharmacyId, "CART_REMOVE", {
        productId,
        metadata: {
          productName: existingItem.name,
          quantity: Math.max(0, Number(existingItem.cartQuantity || 1) - 1),
          source: "patient_marketplace",
        },
      });
    }
  };

  const getCartItemQuantity = (productId) => {
    const item = cartItems.find((item) => item.id === productId);
    return item ? item.cartQuantity : 0;
  };

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + item.cartQuantity, 0);
  };

  // Handle pharmacy consultation call
  const handlePharmacyConsultation = async (mode = "video") => {
    try {
      const selectedPharmacyId =
        cartItems[0]?.pharmacyId ||
        filteredProducts.find((product) => !!product.pharmacyId)?.pharmacyId ||
        "";

      if (!selectedPharmacyId) {
        showToast(
          "No pharmacy selected. Add an item from a pharmacy first.",
          "warning",
        );
        return;
      }

      await makePharmacyCall(selectedPharmacyId, null, { mode });
    } catch (error) {
      console.error("Failed to start pharmacy consultation:", error);
    }
  };

  const promptPharmacyCallMode = () => {
    Alert.alert("Start Call", "Choose call type", [
      { text: "Audio", onPress: () => handlePharmacyConsultation("audio") },
      { text: "Video", onPress: () => handlePharmacyConsultation("video") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderProductCard = ({ item, index }) => {
    const cartQuantity = getCartItemQuantity(item.id);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "timing",
          duration: 600,
          delay: index * 100,
        }}
        style={{ marginBottom: 16 }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 4,
            opacity: item.inStock ? 1 : 0.6,
          }}
          activeOpacity={0.8}
          onPress={() => {
            trackMarketplaceEvent(item.pharmacyId, "PRODUCT_VIEW", {
              productId: item.id,
              metadata: {
                productName: item.name,
                category: item.category || null,
                source: "patient_marketplace_card",
              },
            });
            router.push(`/(app)/(patient)/product/${item.id}`);
          }}
        >
          <View style={{ flexDirection: "row" }}>
            {/* Product Image */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                backgroundColor: theme.surface,
                marginRight: 16,
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              {item.image ? (
                <Image
                  source={{ uri: resolveMediaUrl(item.image) }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Pill color={theme.iconColor} size={32} />
              )}
            </View>

            {/* Product Info */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    flex: 1,
                  }}
                >
                  {item.name}
                </Text>

                <TouchableOpacity
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Heart color={theme.iconColor} size={16} />
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 8,
                  lineHeight: 18,
                }}
              >
                {item.description}
              </Text>

              {/* Brand & Prescription Badge */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textTertiary,
                  }}
                >
                  {item.brand}
                </Text>

                {item.requiresPrescription && (
                  <View
                    style={{
                      backgroundColor: `${theme.warning}20`,
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Inter_500Medium",
                        color: theme.warning,
                      }}
                    >
                      Rx Required
                    </Text>
                  </View>
                )}
              </View>

              {/* Rating & Reviews */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Star color="#FFD700" size={12} fill="#FFD700" />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.text,
                    marginLeft: 4,
                    marginRight: 8,
                  }}
                >
                  {item.rating}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                  }}
                >
                  ({item.reviews} reviews)
                </Text>
              </View>

              {/* Pharmacy Info */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <MapPin color={theme.primary} size={12} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginLeft: 4,
                    flex: 1,
                  }}
                >
                  {item.pharmacy} • {item.deliveryTime}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      {
                        pathname: "/(app)/(patient)/pharmacy-location",
                        params: {
                          pharmacy: item.pharmacy,
                          pharmacyId: item.pharmacyId || "",
                        },
                      },
                    )
                  }
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.primary,
                    }}
                  >
                    View
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price & Actions */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "Inter_700Bold",
                        color: theme.text,
                      }}
                    >
                      {formatCurrency(item.price)}
                    </Text>

                    {item.discount > 0 && (
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_400Regular",
                          color: theme.textTertiary,
                          textDecorationLine: "line-through",
                          marginLeft: 8,
                        }}
                      >
                        {formatCurrency(item.originalPrice)}
                      </Text>
                    )}
                  </View>

                  {item.discount > 0 && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        color: theme.success,
                      }}
                    >
                  {item.discount}% off
                    </Text>
                  )}
                </View>

                {/* Add to Cart Controls */}
                {item.inStock && (
                  <View>
                    {cartQuantity === 0 ? (
                      <TouchableOpacity
                        style={{
                          backgroundColor: theme.primary,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                        }}
                        onPress={() => addToCart(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: "Inter_600SemiBold",
                            color: "#FFFFFF",
                          }}
                        >
                          Add to Cart
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: theme.surface,
                          borderRadius: 12,
                          padding: 4,
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: theme.primary,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          onPress={() => removeFromCart(item.id)}
                        >
                          <Minus color="#FFFFFF" size={16} />
                        </TouchableOpacity>

                        <Text
                          style={{
                            fontSize: 16,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.text,
                            marginHorizontal: 16,
                            minWidth: 24,
                            textAlign: "center",
                          }}
                        >
                          {cartQuantity}
                        </Text>

                        <TouchableOpacity
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: theme.primary,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          onPress={() => addToCart(item)}
                        >
                          <Plus color="#FFFFFF" size={16} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {!item.inStock && (
                  <View
                    style={{
                      backgroundColor: `${theme.error}20`,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        color: theme.error,
                      }}
                    >
                      Out of Stock
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Pharmacy
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
              }}
            >
              Order medicines and get them delivered
            </Text>
          </View>

          {/* Consultation Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.accent,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={promptPharmacyCallMode}
            activeOpacity={0.8}
          >
            <Phone color="#FFFFFF" size={16} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
                marginLeft: 8,
              }}
            >
              Consult
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          {prescriptionId ? (
            <View
              style={{
                backgroundColor: `${theme.warning}15`,
                borderColor: `${theme.warning}60`,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.warning,
                  marginBottom: 2,
                }}
              >
                Prescription Selected
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Prescription ID: {prescriptionId}
              </Text>
            </View>
          ) : null}
          {scopedPharmacyId ? (
            <View
              style={{
                backgroundColor: `${theme.primary}15`,
                borderColor: `${theme.primary}55`,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.primary,
                  marginBottom: 2,
                }}
              >
                Pharmacy Scope Active
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                Showing stock for: {scopedPharmacyName || "Selected Pharmacy"}
              </Text>
            </View>
          ) : null}
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
              placeholder="Search medicines..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <TouchableOpacity
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => setShowFilters((prev) => !prev)}
            >
              <Filter color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
          {showFilters && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text, marginBottom: 8 }}>
                Advanced Filters
              </Text>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12 }}>
                <Picker
                  selectedValue={locationFilter}
                  onValueChange={(value) => setLocationFilter(value)}
                  dropdownIconColor={theme.text}
                  style={{ color: theme.text }}
                >
                  <Picker.Item label="All Locations" value="" />
                  {locationOptions.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        {/* Categories */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={{
                  backgroundColor:
                    activeCategory === category.id
                      ? theme.primary
                      : theme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
                onPress={() => setActiveCategory(category.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color:
                      activeCategory === category.id
                        ? "#FFFFFF"
                        : theme.textSecondary,
                  }}
                >
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 600 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 60,
              }}
            >
              {marketplaceQuery.isLoading ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator color={theme.primary} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                      marginTop: 12,
                    }}
                  >
                    Loading products...
                  </Text>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: theme.surface,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Pill color={theme.iconColor} size={32} />
                  </View>

                  <Text
                    style={{
                      fontSize: 18,
                      fontFamily: "Nunito_600SemiBold",
                      color: theme.text,
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    {marketplaceQuery.isError
                      ? "Unable to load products"
                      : "No products found"}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                      textAlign: "center",
                      lineHeight: 20,
                      paddingHorizontal: 40,
                    }}
                  >
                    {marketplaceQuery.isError
                      ? "Please try again shortly."
                      : "Try adjusting your search or browse categories"}
                  </Text>
                </>
              )}
            </MotiView>
          )}
        />

        {/* Cart Button */}
        {getTotalCartItems() > 0 && (
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 20,
              left: 24,
              right: 24,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 16,
                paddingHorizontal: 24,
                paddingVertical: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(patient)/cart",
                  params: prescriptionId ? { prescriptionId } : undefined,
                })
              }
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <ShoppingCart color="#FFFFFF" size={18} />
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  View Cart ({getTotalCartItems()} items)
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                  color: "#FFFFFF",
                }}
              >
                {formatCurrency(
                  cartItems.reduce(
                    (total, item) => total + item.price * item.cartQuantity,
                    0,
                  ),
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <VideoCall
          isActive={Boolean(currentCall)}
          incomingCall={incomingCall}
          participantName={currentCall?.participantName}
          participantRole={currentCall?.participantRole}
          callMode={currentCall?.mode || "video"}
          callStatus={callStatus}
          callDuration={callDuration}
          callType={currentCall?.type || "pharmacy"}
          sessionId={currentCall?.sessionId}
          remoteVideoUrl={currentCall?.remoteVideoUrl}
          callSession={currentCall?.callSession}
          onAcceptCall={() => {
            if (incomingCall?.sessionId) {
              answerCall(incomingCall.sessionId, {
                participantName: incomingCall.participantName,
                participantRole: incomingCall.participantRole,
                participantId: incomingCall.participantId,
                type: incomingCall.type,
                mode: incomingCall.mode,
              });
            }
          }}
          onRejectCall={() => {
            if (incomingCall?.sessionId) {
              rejectCall(incomingCall.sessionId);
            }
          }}
          onEndCall={() => endCall()}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleCamera={toggleCamera}
          onToggleHold={toggleHold}
          onRemoteJoined={() => markCallConnected()}
        />
      </View>
    </ScreenLayout>
  );
}
