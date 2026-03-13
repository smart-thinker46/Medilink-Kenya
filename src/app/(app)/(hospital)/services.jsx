import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const normalizeText = (value) => String(value || "").trim();

export default function HospitalServicesScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ["hospital-services"],
    queryFn: () => apiClient.getHospitalServices(),
  });

  const services = servicesQuery.data?.items || [];

  const [draft, setDraft] = useState({ name: "", description: "", category: "" });
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({ name: "", description: "", category: "" });

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.createHospitalService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-services"] });
      setDraft({ name: "", description: "", category: "" });
      showToast("Service added.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to add service.", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.updateHospitalService(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-services"] });
      setEditingId(null);
      showToast("Service updated.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to update service.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deleteHospitalService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-services"] });
      showToast("Service deleted.", "success");
    },
    onError: (error) => {
      showToast(error?.message || "Failed to delete service.", "error");
    },
  });

  const handleCreate = () => {
    const name = normalizeText(draft.name);
    if (!name) {
      showToast("Service name is required.", "warning");
      return;
    }
    createMutation.mutate({
      name,
      description: normalizeText(draft.description) || undefined,
      category: normalizeText(draft.category) || undefined,
    });
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditingDraft({
      name: service.name || "",
      description: service.description || "",
      category: service.category || "",
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    const name = normalizeText(editingDraft.name);
    if (!name) {
      showToast("Service name is required.", "warning");
      return;
    }
    updateMutation.mutate({
      id: editingId,
      payload: {
        name,
        description: normalizeText(editingDraft.description) || undefined,
        category: normalizeText(editingDraft.category) || undefined,
      },
    });
  };

  const handleDelete = (service) => {
    Alert.alert(
      "Delete Service",
      `Remove "${service?.name || "this service"}" from your hospital services?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(service.id),
        },
      ],
    );
  };

  const isBusy = createMutation.isLoading || updateMutation.isLoading || deleteMutation.isLoading;

  const emptyState = useMemo(() => services.length === 0, [services.length]);

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
          Hospital Services
        </Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
          Add services offered by your hospital so patients can find you faster.
        </Text>

        <View
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 16,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Add new service
          </Text>
          <TextInput
            placeholder="Service name"
            placeholderTextColor={theme.textSecondary}
            value={draft.name}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))}
            style={{
              marginTop: 10,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              color: theme.text,
              fontFamily: "Inter_400Regular",
            }}
          />
          <TextInput
            placeholder="Category (optional)"
            placeholderTextColor={theme.textSecondary}
            value={draft.category}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, category: value }))}
            style={{
              marginTop: 10,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              color: theme.text,
              fontFamily: "Inter_400Regular",
            }}
          />
          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor={theme.textSecondary}
            value={draft.description}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, description: value }))}
            style={{
              marginTop: 10,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              color: theme.text,
              fontFamily: "Inter_400Regular",
            }}
          />
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isBusy}
            style={{
              marginTop: 12,
              backgroundColor: theme.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: isBusy ? 0.7 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus color="#fff" size={16} />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              Add Service
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Current services
          </Text>
          {emptyState ? (
            <Text style={{ marginTop: 10, color: theme.textSecondary }}>
              No services added yet.
            </Text>
          ) : (
            services.map((service) => {
              const isEditing = editingId === service.id;
              return (
                <View
                  key={service.id}
                  style={{
                    marginTop: 10,
                    backgroundColor: theme.card,
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderTopWidth: isDark ? 0 : 1.5,
                    borderTopColor: isDark ? theme.border : theme.accent,
                  }}
                >
                  {isEditing ? (
                    <>
                      <TextInput
                        placeholder="Service name"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.name}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, name: value }))
                        }
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          color: theme.text,
                          fontFamily: "Inter_400Regular",
                        }}
                      />
                      <TextInput
                        placeholder="Category"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.category}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, category: value }))
                        }
                        style={{
                          marginTop: 8,
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          color: theme.text,
                          fontFamily: "Inter_400Regular",
                        }}
                      />
                      <TextInput
                        placeholder="Description"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.description}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, description: value }))
                        }
                        style={{
                          marginTop: 8,
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          color: theme.text,
                          fontFamily: "Inter_400Regular",
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={handleSave}
                          disabled={isBusy}
                          style={{
                            flex: 1,
                            backgroundColor: theme.primary,
                            borderRadius: 10,
                            paddingVertical: 9,
                            alignItems: "center",
                            opacity: isBusy ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                            Save
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEditingId(null)}
                          style={{
                            flex: 1,
                            backgroundColor: theme.surface,
                            borderRadius: 10,
                            paddingVertical: 9,
                            alignItems: "center",
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                        {service.name}
                      </Text>
                      {service.category ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Category: {service.category}
                        </Text>
                      ) : null}
                      {service.description ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          {service.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => startEdit(service)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Pencil color={theme.text} size={14} />
                          <Text style={{ fontSize: 12, color: theme.text }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(service)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            backgroundColor: `${theme.error}22`,
                            borderWidth: 1,
                            borderColor: `${theme.error}55`,
                          }}
                        >
                          <Trash2 color={theme.error} size={14} />
                          <Text style={{ fontSize: 12, color: theme.error }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
