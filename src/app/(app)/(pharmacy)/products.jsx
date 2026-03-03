import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal, ActivityIndicator, Image, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import { ArrowLeft, Plus, Package, Edit3, Trash2, ShieldAlert, History, Upload } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { getPharmacyProfileCompletion } from "@/utils/pharmacyProfileCompletion";
import { uploadFileIfNeeded } from "@/utils/upload";
import { resolveMediaUrl } from "@/utils/media";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

export default function PharmacyProductsScreen() {
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

  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["pharmacy-products", pharmacyId],
    queryFn: () => apiClient.getProducts(pharmacyId),
    enabled: Boolean(pharmacyId),
  });

  const products = productsQuery.data || [];

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    quantity: "",
    stock: "",
    category: "",
    manufacturer: "",
    batchNumber: "",
    sku: "",
    reorderLevel: "5",
    expiryDate: "",
    prescriptionRequired: false,
    description: "",
  });
  const [productImage, setProductImage] = useState(null);
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      quantity: "",
      stock: "",
      category: "",
      manufacturer: "",
      batchNumber: "",
      sku: "",
      reorderLevel: "5",
      expiryDate: "",
      prescriptionRequired: false,
      description: "",
    });
    setProductImage(null);
    setEditingProduct(null);
    setFormError("");
  };

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.createProduct(pharmacyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-products", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stock-movements", pharmacyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      apiClient.updateProduct(pharmacyId, productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-products", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stock-movements", pharmacyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId) => apiClient.deleteProduct(pharmacyId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-products", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stock-movements", pharmacyId] });
    },
  });

  const isSaving = createMutation.isLoading || updateMutation.isLoading;
  const isDeleting = deleteMutation.isLoading;

  const handleAddProduct = () => {
    if (!pharmacyId) {
      showToast("Pharmacy tenant not found for this account.", "error");
      return;
    }
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before managing products.",
        "warning",
      );
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const handleProtected = (action) => {
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before managing products.",
        "warning",
      );
      return;
    }
    action();
  };

  const openEdit = (product) => {
    handleProtected(() => {
      setEditingProduct(product);
      setFormData({
        name: product.name || "",
        price: product.price?.toString() || "",
        quantity: (product.quantity ?? product.stock ?? product.numberInStock)?.toString() || "",
        stock: (product.stock ?? product.quantity)?.toString() || "",
        category: product.category || "",
        manufacturer: product.manufacturer || "",
        batchNumber: product.batchNumber || "",
        sku: product.sku || product.barcode || "",
        reorderLevel: String(product.reorderLevel ?? 5),
        expiryDate: product.expiryDate ? String(product.expiryDate).slice(0, 10) : "",
        prescriptionRequired: Boolean(
          product.prescriptionRequired ?? product.requiresPrescription ?? product.prescription,
        ),
        description: product.description || "",
      });
      setProductImage(product.imageUrl || product.image || null);
      setShowForm(true);
    });
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

  const handleSaveProduct = async () => {
    setFormError("");
    if (!pharmacyId) {
      const msg = "Pharmacy tenant not found for this account.";
      setFormError(msg);
      showToast(msg, "error");
      return;
    }
    if (!formData.name.trim() || !formData.price.trim()) {
      const msg = "Please enter a name and price.";
      setFormError(msg);
      showToast(msg, "warning");
      return;
    }

    const price = Number(formData.price);
    const quantity = Number(formData.quantity || formData.stock || 0);
    const stock = Number(formData.stock || formData.quantity || 0);
    const reorderLevel = Number(formData.reorderLevel || 5);
    if (!Number.isFinite(price) || price < 0) {
      const msg = "Price must be a valid number.";
      setFormError(msg);
      showToast(msg, "warning");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      const msg = "Quantity must be a valid number.";
      setFormError(msg);
      showToast(msg, "warning");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      const msg = "Stock must be a valid number.";
      setFormError(msg);
      showToast(msg, "warning");
      return;
    }
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      const msg = "Reorder level must be a valid number.";
      setFormError(msg);
      showToast(msg, "warning");
      return;
    }

    try {
      const existingImage =
        editingProduct?.imageUrl || editingProduct?.image || editingProduct?.photoUrl || null;
      const hasChangedImage =
        Boolean(productImage) &&
        String(productImage).trim() !== String(existingImage || "").trim();
      const uploadedProductImage = hasChangedImage
        ? await uploadFileIfNeeded(productImage, { kind: "image" })
        : existingImage;

      const payload = {
        name: formData.name.trim(),
        price,
        quantity,
        category: formData.category.trim(),
        manufacturer: formData.manufacturer.trim(),
        batchNumber: formData.batchNumber.trim(),
        sku: formData.sku.trim(),
        barcode: formData.sku.trim(),
        reorderLevel,
        stock,
        numberInStock: stock,
        prescriptionRequired: Boolean(formData.prescriptionRequired),
        requiresPrescription: Boolean(formData.prescriptionRequired),
        expiryDate: formData.expiryDate ? formData.expiryDate : null,
        description: formData.description.trim(),
        imageUrl: uploadedProductImage,
        image: uploadedProductImage,
        photoUrl: uploadedProductImage,
      };

      if (editingProduct?.id) {
        await updateMutation.mutateAsync({
          productId: editingProduct.id,
          payload,
        });
        setFormError("");
        showToast("Product updated successfully.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        setFormError("");
        showToast("Product added successfully.", "success");
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      if (error?.missingFields?.length) {
        const msg = `Please complete: ${error.missingFields.join(", ")}`;
        setFormError(msg);
        showToast(
          msg,
          "warning",
        );
        return;
      }
      const msg = error.message || "Save failed. Please try again.";
      setFormError(msg);
      showToast(msg, "error");
    }
  };

  const handleDelete = (productId) => {
    if (!pharmacyId) {
      showToast("Pharmacy tenant not found for this account.", "error");
      return;
    }
    handleProtected(() => {
      Alert.alert("Delete Product", "Are you sure you want to delete?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(productId);
              await deleteMutation.mutateAsync(productId);
              showToast("Product removed.", "success");
            } catch (error) {
              if (error?.missingFields?.length) {
                showToast(
                  `Please complete: ${error.missingFields.join(", ")}`,
                  "warning",
                );
                return;
              }
              showToast(error.message || "Delete failed. Please try again.", "error");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    });
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
              Products
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
              onPress={() => router.push("/(app)/(pharmacy)/stock-movements")}
            >
              <History color={theme.iconColor} size={18} />
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
              onPress={handleAddProduct}
            >
              <Plus color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>
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

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Product management unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(pharmacy)/edit-profile")}
          />
        )}

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 80 }}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                    overflow: "hidden",
                  }}
                >
                  {(item.imageUrl || item.image || item.photoUrl) ? (
                    <Image
                      source={{ uri: resolveMediaUrl(item.imageUrl || item.image || item.photoUrl) }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Package color={theme.iconColor} size={20} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                    }}
                  >
                    {item.name || item.productName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                  >
                    KES {item.price} • Qty {item.quantity ?? 0} • Stock {item.stock ?? item.numberInStock ?? 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {item.manufacturer ? `${item.manufacturer}` : "Manufacturer: -"}
                    {item.batchNumber ? ` • Batch ${item.batchNumber}` : ""}
                    {item.sku ? ` • SKU ${item.sku}` : ""}
                  </Text>
                  {__DEV__ && (item.imageUrl || item.image || item.photoUrl) ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 10, color: theme.textTertiary, marginTop: 2 }}
                    >
                      {resolveMediaUrl(item.imageUrl || item.image || item.photoUrl)}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
                    {Boolean(item.prescriptionRequired ?? item.requiresPrescription ?? item.prescription) && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: `${theme.warning}20`,
                          borderRadius: 10,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <ShieldAlert color={theme.warning} size={11} />
                        <Text style={{ fontSize: 11, color: theme.warning, marginLeft: 4 }}>
                          Prescription
                        </Text>
                      </View>
                    )}
                    {item.expiryDate ? (
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        Exp: {String(item.expiryDate).slice(0, 10)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={{ marginRight: 12 }}
                  onPress={() => openEdit(item)}
                  disabled={isSaving || isDeleting}
                >
                  <Edit3 color={theme.iconColor} size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  disabled={isSaving || (isDeleting && deletingId === item.id)}
                >
                  {isDeleting && deletingId === item.id ? (
                    <ActivityIndicator size="small" color={theme.error} />
                  ) : (
                    <Trash2 color={theme.error} size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </MotiView>
          )}
        />

        <Modal visible={showForm} animationType="slide" transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <ScrollView
              style={{ maxHeight: "92%" }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Nunito_700Bold",
                    color: theme.text,
                    marginBottom: 16,
                  }}
                >
                  {editingProduct ? "Edit Product" : "Add Product"}
                </Text>

              <TouchableOpacity
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 10,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={handlePickProductImage}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    backgroundColor: theme.card,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                {productImage ? (
                    <Image
                      source={{ uri: resolveMediaUrl(productImage) || productImage }}
                      style={{ width: "100%", height: "100%" }}
                    />
                ) : (
                    <Upload color={theme.iconColor} size={16} />
                  )}
                </View>
                <Text style={{ marginLeft: 10, fontSize: 13, color: theme.textSecondary }}>
                  {productImage ? "Change product image" : "Upload product image"}
                </Text>
              </TouchableOpacity>

              <TextInput
                placeholder="Product name"
                placeholderTextColor={theme.textSecondary}
                value={formData.name}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Price (KES)"
                placeholderTextColor={theme.textSecondary}
                value={formData.price}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, price: value }))}
                keyboardType="numeric"
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Stock"
                placeholderTextColor={theme.textSecondary}
                value={formData.stock}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, stock: value }))}
                keyboardType="numeric"
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Quantity"
                placeholderTextColor={theme.textSecondary}
                value={formData.quantity}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, quantity: value }))}
                keyboardType="numeric"
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Category (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.category}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 16,
                }}
              />
              <TextInput
                placeholder="Manufacturer"
                placeholderTextColor={theme.textSecondary}
                value={formData.manufacturer}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, manufacturer: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Batch number"
                placeholderTextColor={theme.textSecondary}
                value={formData.batchNumber}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, batchNumber: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="SKU / Barcode"
                placeholderTextColor={theme.textSecondary}
                value={formData.sku}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, sku: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Reorder level"
                placeholderTextColor={theme.textSecondary}
                value={formData.reorderLevel}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, reorderLevel: value }))}
                keyboardType="numeric"
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Expiry date (YYYY-MM-DD)"
                placeholderTextColor={theme.textSecondary}
                value={formData.expiryDate}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, expiryDate: value }))}
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  color: theme.text,
                  marginBottom: 12,
                }}
              />
              <TextInput
                placeholder="Description (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.description}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                multiline
                style={{
                  minHeight: 72,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.text,
                  marginBottom: 12,
                  textAlignVertical: "top",
                }}
              />
              {formError ? (
                <View
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: `${theme.error}55`,
                    backgroundColor: `${theme.error}12`,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.error }}>{formError}</Text>
                </View>
              ) : null}
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 8,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                  Prescription Required
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 9,
                      alignItems: "center",
                      backgroundColor: formData.prescriptionRequired ? `${theme.warning}20` : theme.card,
                      borderWidth: 1,
                      borderColor: formData.prescriptionRequired ? theme.warning : theme.border,
                    }}
                    onPress={() => setFormData((prev) => ({ ...prev, prescriptionRequired: true }))}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: formData.prescriptionRequired ? theme.warning : theme.textSecondary,
                      }}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 9,
                      alignItems: "center",
                      backgroundColor: !formData.prescriptionRequired ? `${theme.success}20` : theme.card,
                      borderWidth: 1,
                      borderColor: !formData.prescriptionRequired ? theme.success : theme.border,
                    }}
                    onPress={() => setFormData((prev) => ({ ...prev, prescriptionRequired: false }))}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: !formData.prescriptionRequired ? theme.success : theme.textSecondary,
                      }}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  disabled={isSaving}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.textSecondary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: isSaving ? 0.7 : 1,
                  }}
                  onPress={handleSaveProduct}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
}
