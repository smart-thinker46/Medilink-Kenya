import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit3, Trash2, Package, Store, Upload } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { uploadFileIfNeeded } from "@/utils/upload";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { getHospitalProfileCompletion } from "@/utils/hospitalProfileCompletion";
import { resolveMediaUrl } from "@/utils/media";

export default function HospitalInventoryProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();
  const { profile } = useHospitalProfile();
  const completion = useMemo(
    () => getHospitalProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;
  const hospitalTenantId = auth?.tenantId || auth?.tenant?.id || null;

  const productsQuery = useQuery({
    queryKey: ["hospital-inventory-products", hospitalTenantId],
    queryFn: () => apiClient.getHospitalInventoryProducts(hospitalTenantId),
    enabled: Boolean(hospitalTenantId),
  });

  const products = productsQuery.data || [];
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    expiryDate: "",
    prescriptionRequired: false,
    description: "",
  });
  const [productImage, setProductImage] = useState(null);

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.createHospitalInventoryProduct(hospitalTenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-products", hospitalTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      apiClient.updateHospitalInventoryProduct(hospitalTenantId, productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-products", hospitalTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId) =>
      apiClient.deleteHospitalInventoryProduct(hospitalTenantId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-products", hospitalTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hospital-inventory-pos-products", hospitalTenantId],
      });
    },
  });

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      price: "",
      stock: "",
      expiryDate: "",
      prescriptionRequired: false,
      description: "",
    });
    setProductImage(null);
  };

  const openCreate = () => {
    if (!isProfileComplete) {
      showToast("Complete hospital profile to manage inventory.", "warning");
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEdit = (product) => {
    if (!isProfileComplete) {
      showToast("Complete hospital profile to manage inventory.", "warning");
      return;
    }
    setEditingProduct(product);
    setFormData({
      name: product.name || product.productName || "",
      category: product.category || "",
      price: String(product.price || ""),
      stock: String(product.stock ?? product.numberInStock ?? product.quantity ?? ""),
      expiryDate: product.expiryDate ? String(product.expiryDate).slice(0, 10) : "",
      prescriptionRequired: Boolean(
        product.prescriptionRequired ?? product.requiresPrescription,
      ),
      description: product.description || "",
    });
    setProductImage(product.imageUrl || product.image || null);
    setShowForm(true);
  };

  const handlePickProductImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setProductImage(result.assets[0].uri);
      }
    } catch {
      showToast("Unable to pick product image.", "error");
    }
  };

  const saveProduct = async () => {
    if (!formData.name.trim()) {
      showToast("Product name is required.", "warning");
      return;
    }
    const price = Number(formData.price);
    const stock = Number(formData.stock);
    if (!Number.isFinite(price) || price < 0) {
      showToast("Invalid product price.", "warning");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      showToast("Invalid stock quantity.", "warning");
      return;
    }

    try {
      const uploadedProductImage = await uploadFileIfNeeded(productImage, { kind: "image" });
      const payload = {
      name: formData.name.trim(),
      productName: formData.name.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      price,
      stock,
      quantity: stock,
      numberInStock: stock,
      reorderLevel: 5,
      prescriptionRequired: Boolean(formData.prescriptionRequired),
      requiresPrescription: Boolean(formData.prescriptionRequired),
      expiryDate: formData.expiryDate || null,
      imageUrl: uploadedProductImage,
      image: uploadedProductImage,
      };
      if (editingProduct?.id) {
        await updateMutation.mutateAsync({
          productId: editingProduct.id,
          payload,
        });
        showToast("Product updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Product added.", "success");
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      showToast(error.message || "Unable to save product.", "error");
    }
  };

  const deleteProduct = (productId) => {
    Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(productId);
            showToast("Product deleted.", "success");
          } catch (error) {
            showToast(error.message || "Delete failed.", "error");
          }
        },
      },
    ]);
  };

  return (
    <ScreenLayout>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
              Hospital Inventory
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/(app)/(hospital)/inventory-pos")}
            >
              <Store color={theme.iconColor} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={openCreate}
            >
              <Plus color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Inventory management unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(hospital)/edit-profile")}
          />
        )}

        <FlatList
          data={products}
          keyExtractor={(item, index) => item.id || `item-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {(item.imageUrl || item.image) ? (
                <View
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 10,
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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Package color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: theme.text,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {item.name || item.productName}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Stock: {item.stock ?? item.numberInStock ?? item.quantity ?? 0}
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Category: {item.category || "General"}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                Price: KES {Number(item.price || 0)}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 9,
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={() => openEdit(item)}
                >
                  <Edit3 color={theme.iconColor} size={15} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 9,
                    backgroundColor: "#FEF2F2",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={() => deleteProduct(item.id)}
                >
                  <Trash2 color="#DC2626" size={15} />
                  <Text style={{ marginLeft: 6, color: "#DC2626" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Text style={{ color: theme.textSecondary }}>
                No inventory products added yet.
              </Text>
            </View>
          )}
        />

        <Modal visible={showForm} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: "Nunito_700Bold", marginBottom: 12 }}>
                {editingProduct ? "Edit Product" : "Add Product"}
              </Text>

              {[
                { key: "name", label: "Product Name", keyboardType: "default" },
                { key: "category", label: "Category", keyboardType: "default" },
                { key: "price", label: "Price", keyboardType: "numeric" },
                { key: "stock", label: "Stock Quantity", keyboardType: "numeric" },
                { key: "expiryDate", label: "Expiry Date (YYYY-MM-DD)", keyboardType: "default" },
                { key: "description", label: "Description", keyboardType: "default" },
              ].map((field) => (
                <View
                  key={field.key}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    marginBottom: 8,
                  }}
                >
                  <TextInput
                    placeholder={field.label}
                    placeholderTextColor={theme.textSecondary}
                    value={String(formData[field.key] || "")}
                    onChangeText={(value) =>
                      setFormData((prev) => ({ ...prev, [field.key]: value }))
                    }
                    keyboardType={field.keyboardType}
                    style={{ color: theme.text, paddingVertical: 10 }}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handlePickProductImage}
              >
                <Upload color={theme.iconColor} size={16} />
                <Text style={{ marginLeft: 8, color: theme.textSecondary }}>
                  {productImage ? "Change Product Image" : "Upload Product Image"}
                </Text>
              </TouchableOpacity>

              {productImage ? (
                <View
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 10,
                    backgroundColor: theme.surface,
                  }}
                >
                  <Image
                    source={{ uri: resolveMediaUrl(productImage) || productImage }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              <TouchableOpacity
                style={{
                  backgroundColor: formData.prescriptionRequired
                    ? `${theme.primary}20`
                    : theme.surface,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  marginBottom: 10,
                }}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    prescriptionRequired: !prev.prescriptionRequired,
                  }))
                }
              >
                <Text style={{ color: formData.prescriptionRequired ? theme.primary : theme.textSecondary }}>
                  Prescription Required: {formData.prescriptionRequired ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={saveProduct}
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  {createMutation.isLoading || updateMutation.isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
}
