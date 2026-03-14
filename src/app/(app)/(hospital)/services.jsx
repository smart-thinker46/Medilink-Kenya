import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import {
  HOSPITAL_SERVICE_CATALOG,
  HOSPITAL_SERVICE_CATEGORIES,
} from "@/constants/hospitalServiceCatalog";

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

  const [draft, setDraft] = useState({
    name: "",
    category: "",
    description: "",
    availability: "24 Hours",
    costMin: "",
    costMax: "",
    department: "",
    doctors: "",
    equipment: "",
    status: "ACTIVE",
  });
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({
    name: "",
    category: "",
    description: "",
    availability: "24 Hours",
    costMin: "",
    costMax: "",
    department: "",
    doctors: "",
    equipment: "",
    status: "ACTIVE",
  });
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.createHospitalService(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(["hospital-services"], (prev) => {
        if (!prev) return { items: [created] };
        if (Array.isArray(prev)) return [created, ...prev];
        const items = Array.isArray(prev.items) ? prev.items : [];
        return { ...prev, items: [created, ...items] };
      });
      queryClient.invalidateQueries({ queryKey: ["hospital-services"] });
      setDraft({
        name: "",
        category: "",
        description: "",
        availability: "24 Hours",
        costMin: "",
        costMax: "",
        department: "",
        doctors: "",
        equipment: "",
        status: "ACTIVE",
      });
      if (created?.id) {
        showToast(`Service saved (${created.name || "Service"}) • ID ${created.id}`, "success");
      } else {
        showToast("Service added.", "success");
      }
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
    if (!normalizeText(draft.costMin)) {
      showToast("Service pricing is required (minimum cost).", "warning");
      return;
    }
    const minCost = Number(draft.costMin);
    const maxCost = draft.costMax ? Number(draft.costMax) : null;
    if (Number.isNaN(minCost)) {
      showToast("Minimum cost must be a number.", "warning");
      return;
    }
    if (maxCost !== null && Number.isNaN(maxCost)) {
      showToast("Maximum cost must be a number.", "warning");
      return;
    }
    if (maxCost !== null && maxCost < minCost) {
      showToast("Maximum cost cannot be less than minimum cost.", "warning");
      return;
    }
    createMutation.mutate({
      name,
      description: normalizeText(draft.description) || undefined,
      category: normalizeText(draft.category) || undefined,
      availability: normalizeText(draft.availability) || undefined,
      costMin: minCost,
      costMax: maxCost ?? undefined,
      department: normalizeText(draft.department) || undefined,
      doctors: normalizeText(draft.doctors) ? draft.doctors : undefined,
      equipment: normalizeText(draft.equipment) ? draft.equipment : undefined,
      status: normalizeText(draft.status) || "ACTIVE",
    });
  };

  const applyServiceTemplate = (item) => {
    if (!item) return;
    setDraft((prev) => ({
      ...prev,
      name: item.name,
      category: prev.category || item.category || "",
      description: prev.description || (item.sw ? `Swahili: ${item.sw}` : ""),
    }));
    showToast(`Loaded "${item.name}"`, "success");
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditingDraft({
      name: service.name || "",
      description: service.description || "",
      category: service.category || "",
      availability: service.availability || "24 Hours",
      costMin: service.costMin ? String(service.costMin) : "",
      costMax: service.costMax ? String(service.costMax) : "",
      department: service.department || "",
      doctors: Array.isArray(service.doctors) ? service.doctors.join(", ") : "",
      equipment: Array.isArray(service.equipment) ? service.equipment.join(", ") : "",
      status: service.status || "ACTIVE",
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    const name = normalizeText(editingDraft.name);
    if (!name) {
      showToast("Service name is required.", "warning");
      return;
    }
    if (!normalizeText(editingDraft.costMin)) {
      showToast("Service pricing is required (minimum cost).", "warning");
      return;
    }
    const minCost = Number(editingDraft.costMin);
    const maxCost = editingDraft.costMax ? Number(editingDraft.costMax) : null;
    if (Number.isNaN(minCost)) {
      showToast("Minimum cost must be a number.", "warning");
      return;
    }
    if (maxCost !== null && Number.isNaN(maxCost)) {
      showToast("Maximum cost must be a number.", "warning");
      return;
    }
    if (maxCost !== null && maxCost < minCost) {
      showToast("Maximum cost cannot be less than minimum cost.", "warning");
      return;
    }
    updateMutation.mutate({
      id: editingId,
      payload: {
        name,
        description: normalizeText(editingDraft.description) || undefined,
        category: normalizeText(editingDraft.category) || undefined,
        availability: normalizeText(editingDraft.availability) || undefined,
        costMin: minCost,
        costMax: maxCost ?? undefined,
        department: normalizeText(editingDraft.department) || undefined,
        doctors: normalizeText(editingDraft.doctors) ? editingDraft.doctors : undefined,
        equipment: normalizeText(editingDraft.equipment) ? editingDraft.equipment : undefined,
        status: normalizeText(editingDraft.status) || "ACTIVE",
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
  const nameSuggestions = useMemo(() => {
    const query = normalizeText(draft.name).toLowerCase();
    if (query.length < 2) return [];
    return HOSPITAL_SERVICE_CATALOG.filter((item) => {
      const text = `${item.name} ${item.sw || ""} ${item.category || ""}`.toLowerCase();
      return text.includes(query);
    }).slice(0, 12);
  }, [draft.name]);

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
          {nameSuggestions.length > 0 && (
            <View style={{ marginTop: 10, gap: 8 }}>
              {nameSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.name}-${index}`}
                  onPress={() => applyServiceTemplate(item)}
                  activeOpacity={0.85}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                    {item.name}
                  </Text>
                  {item.sw ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {item.sw}
                    </Text>
                  ) : null}
                  {item.category ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: `${theme.primary}12`,
                          borderWidth: 1,
                          borderColor: `${theme.primary}35`,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: theme.primary }}>{item.category}</Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: `${theme.info}12`,
                          borderWidth: 1,
                          borderColor: `${theme.info}35`,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: theme.info }}>
                          {draft.availability || "24 Hours"}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>
            Service Category
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {HOSPITAL_SERVICE_CATEGORIES.map((option) => {
              const active = draft.category === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDraft((prev) => ({ ...prev, category: option }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
          <Text style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>
            Availability
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {["24 Hours", "Daytime Only", "Appointment Required"].map((option) => {
              const active = draft.availability === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDraft((prev) => ({ ...prev, availability: option }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            placeholder="Department (e.g. Cardiology Department)"
            placeholderTextColor={theme.textSecondary}
            value={draft.department}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, department: value }))}
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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              placeholder="Cost (KES)"
              placeholderTextColor={theme.textSecondary}
              value={draft.costMin}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, costMin: value }))}
              keyboardType="numeric"
              style={{
                marginTop: 10,
                flex: 1,
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
              placeholder="Max (optional)"
              placeholderTextColor={theme.textSecondary}
              value={draft.costMax}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, costMax: value }))}
              keyboardType="numeric"
              style={{
                marginTop: 10,
                flex: 1,
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
          </View>
          <TextInput
            placeholder="Doctors available (comma separated)"
            placeholderTextColor={theme.textSecondary}
            value={draft.doctors}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, doctors: value }))}
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
            placeholder="Equipment used (comma separated)"
            placeholderTextColor={theme.textSecondary}
            value={draft.equipment}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, equipment: value }))}
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
          <Text style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>
            Service Status
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {["ACTIVE", "TEMPORARILY_UNAVAILABLE"].map((option) => {
              const active = draft.status === option;
              const label = option === "ACTIVE" ? "Active" : "Temporarily Unavailable";
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDraft((prev) => ({ ...prev, status: option }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}15` : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
                      <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                        Service Category
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {HOSPITAL_SERVICE_CATEGORIES.map((option) => {
                          const active = editingDraft.category === option;
                          return (
                            <TouchableOpacity
                              key={option}
                              onPress={() =>
                                setEditingDraft((prev) => ({ ...prev, category: option }))
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: active ? theme.primary : theme.border,
                                backgroundColor: active ? `${theme.primary}15` : theme.surface,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
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
                      <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                        Availability
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {["24 Hours", "Daytime Only", "Appointment Required"].map((option) => {
                          const active = editingDraft.availability === option;
                          return (
                            <TouchableOpacity
                              key={option}
                              onPress={() =>
                                setEditingDraft((prev) => ({ ...prev, availability: option }))
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: active ? theme.primary : theme.border,
                                backgroundColor: active ? `${theme.primary}15` : theme.surface,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        placeholder="Department"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.department}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, department: value }))
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
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          placeholder="Cost (KES)"
                          placeholderTextColor={theme.textSecondary}
                          value={editingDraft.costMin}
                          onChangeText={(value) =>
                            setEditingDraft((prev) => ({ ...prev, costMin: value }))
                          }
                          keyboardType="numeric"
                          style={{
                            marginTop: 8,
                            flex: 1,
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
                          placeholder="Max (optional)"
                          placeholderTextColor={theme.textSecondary}
                          value={editingDraft.costMax}
                          onChangeText={(value) =>
                            setEditingDraft((prev) => ({ ...prev, costMax: value }))
                          }
                          keyboardType="numeric"
                          style={{
                            marginTop: 8,
                            flex: 1,
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
                      </View>
                      <TextInput
                        placeholder="Doctors available (comma separated)"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.doctors}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, doctors: value }))
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
                        placeholder="Equipment used (comma separated)"
                        placeholderTextColor={theme.textSecondary}
                        value={editingDraft.equipment}
                        onChangeText={(value) =>
                          setEditingDraft((prev) => ({ ...prev, equipment: value }))
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
                      <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                        Service Status
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {["ACTIVE", "TEMPORARILY_UNAVAILABLE"].map((option) => {
                          const active = editingDraft.status === option;
                          const label = option === "ACTIVE" ? "Active" : "Temporarily Unavailable";
                          return (
                            <TouchableOpacity
                              key={option}
                              onPress={() =>
                                setEditingDraft((prev) => ({ ...prev, status: option }))
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: active ? theme.primary : theme.border,
                                backgroundColor: active ? `${theme.primary}15` : theme.surface,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: active ? theme.primary : theme.textSecondary }}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
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
                      {service.department ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Department: {service.department}
                        </Text>
                      ) : null}
                      {service.description ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          {service.description}
                        </Text>
                      ) : null}
                      {service.availability ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Availability: {service.availability}
                        </Text>
                      ) : null}
                      {(service.costMin || service.costMax) ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Cost: KES {service.costMin || 0} {service.costMax ? `- ${service.costMax}` : ""}
                        </Text>
                      ) : null}
                      {Array.isArray(service.doctors) && service.doctors.length ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Doctors: {service.doctors.join(", ")}
                        </Text>
                      ) : null}
                      {Array.isArray(service.equipment) && service.equipment.length ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Equipment: {service.equipment.join(", ")}
                        </Text>
                      ) : null}
                      {service.status ? (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          Status: {service.status === "TEMPORARILY_UNAVAILABLE" ? "Temporarily Unavailable" : "Active"}
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
