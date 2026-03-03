import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ArrowLeft, MapPin, Phone, Search } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import LocationPreview from "@/components/LocationPreview";
import { getDistanceKm } from "@/utils/locationHelpers";
import { useOnlineUsers } from "@/utils/useOnlineUsers";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";

export default function MedicPatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, refreshInterval, batterySaver } = useAppTheme();
  const { isUserOnline } = useOnlineUsers();
  const {
    isSuperAdmin,
    medicUserId,
    medics,
    setSelectedMedicUserId,
    isLoadingScope,
  } = useMedicScope();
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilters, setQuickFilters] = useState([]);

  const patientsQuery = useQuery({
    queryKey: ["medic-patients", medicUserId],
    queryFn: () =>
      apiClient.getMedicalRecords(undefined, {
        medic_id: medicUserId || undefined,
      }),
    enabled: Boolean(medicUserId),
  });
  const patientsRaw = patientsQuery.data?.items || patientsQuery.data || [];
  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
    refetchInterval: batterySaver ? false : refreshInterval,
  });
  const linkedLocationsQuery = useQuery({
    queryKey: ["linked-locations"],
    queryFn: () => apiClient.getLinkedLocations(),
    refetchInterval: batterySaver ? false : refreshInterval,
  });
  const linkedLocations = linkedLocationsQuery.data || [];
  const linkedMap = linkedLocations.reduce((acc, item) => {
    acc[item.id] = item.location;
    return acc;
  }, {});
  const myLocation = myLocationQuery.data?.location || null;
  const distanceCacheRef = useRef(new Map());
  const getCachedDistance = (targetId, targetLocation) => {
    if (!targetId) return null;
    if (!myLocation || !targetLocation) {
      return distanceCacheRef.current.get(targetId) ?? null;
    }
    const nextDistance = getDistanceKm(myLocation, targetLocation);
    if (nextDistance != null) {
      distanceCacheRef.current.set(targetId, nextDistance);
    }
    return nextDistance ?? distanceCacheRef.current.get(targetId) ?? null;
  };
  const patients = myLocation
    ? [...patientsRaw].sort((a, b) => {
        const aLoc = linkedMap[a.patientId || a.id];
        const bLoc = linkedMap[b.patientId || b.id];
        const aDist = getDistanceKm(myLocation, aLoc);
        const bDist = getDistanceKm(myLocation, bLoc);
        if (aDist == null && bDist == null) return 0;
        if (aDist == null) return 1;
        if (bDist == null) return -1;
        return aDist - bDist;
      })
    : patientsRaw;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const nearbyThresholdKm = 10;
  const toggleQuickFilter = (filterId) => {
    if (filterId === "all") {
      setQuickFilters([]);
      return;
    }
    setQuickFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };
  const filteredPatients = useMemo(() => {
    return patients.filter((item) => {
      const haystack = [
        item.patientName,
        item.name,
        item.condition,
        item.emergencyContactPhone,
        item.phone,
        item.email,
        item.location?.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      const targetId = item.patientId || item.id;
      const targetLocation = linkedMap[targetId] || item.location || null;
      const distanceKm = getDistanceKm(myLocation, targetLocation);

      const matchesQuickFilter =
        quickFilters.length === 0 ||
        quickFilters.every((filterId) => {
          if (filterId === "online") return isUserOnline(item);
          if (filterId === "nearby") {
            return Number.isFinite(distanceKm) && distanceKm <= nearbyThresholdKm;
          }
          if (filterId === "has_location") return Boolean(targetLocation);
          return true;
        });

      return matchesSearch && matchesQuickFilter;
    });
  }, [patients, normalizedSearch, quickFilters, linkedMap, myLocation, isUserOnline]);

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
            My Patients
          </Text>
        </View>
        <View style={{ paddingHorizontal: 24 }}>
          <MedicScopeSelector
            visible={isSuperAdmin}
            medics={medics}
            selectedMedicId={medicUserId}
            onSelect={setSelectedMedicUserId}
            loading={isLoadingScope}
          />
        </View>
        <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Search color={theme.textSecondary} size={16} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search patient, condition, phone, location..."
              placeholderTextColor={theme.textTertiary}
              style={{
                flex: 1,
                marginLeft: 8,
                color: theme.text,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
              }}
            />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 }}>
            {[
              { id: "all", label: "All" },
              { id: "online", label: "Online" },
              { id: "nearby", label: `Nearby (${nearbyThresholdKm}km)` },
              { id: "has_location", label: "Has Location" },
            ].map((chip) => {
              const active =
                chip.id === "all"
                  ? quickFilters.length === 0
                  : quickFilters.includes(chip.id);
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => toggleQuickFilter(chip.id)}
                  activeOpacity={0.85}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? `${theme.primary}18` : theme.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: active ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filteredPatients}
          keyExtractor={(item, index) => item.id || `patient-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 80 }}
              style={{ marginBottom: 16 }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() =>
                  router.push(`/(app)/(medic)/patient-details?patientId=${item.id || ""}`)
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {item.patientName || item.name || "Patient"}
                    </Text>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginLeft: 8,
                        backgroundColor: isUserOnline(item) ? "#22C55E" : theme.textSecondary,
                      }}
                    />
                  </View>
                  {(() => {
                    const targetId = item.patientId || item.id;
                    const distanceKm = getCachedDistance(
                      targetId,
                      linkedMap[targetId],
                    );
                    if (distanceKm == null) return null;
                    return (
                      <View
                        style={{
                          marginLeft: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: `${theme.primary}15`,
                          borderWidth: 1,
                          borderColor: `${theme.primary}35`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.primary,
                          }}
                        >
                          {distanceKm.toFixed(1)} km
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginBottom: 10,
                  }}
                >
                  Condition: {item.condition || "Monitoring"}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MapPin color={theme.textSecondary} size={14} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    {item.location?.address || "Location not set"}
                  </Text>
                  <Phone color={theme.textSecondary} size={14} style={{ marginLeft: 12 }} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    {item.emergencyContactPhone || "--"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/(shared)/location",
                        params: { targetId: item.patientId || item.id, title: "Patient Location" },
                      })
                    }
                  >
                    <MapPin color={theme.textSecondary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_500Medium",
                        color: theme.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      View Location
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.patientId || item.id ? (
                  <LocationPreview
                    targetId={item.patientId || item.id}
                    theme={theme}
                    isDark={isDark}
                    height={80}
                  />
                ) : null}
              </TouchableOpacity>
            </MotiView>
          )}
          ListEmptyComponent={() => (
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
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                {normalizedSearch || quickFilters.length > 0
                  ? "No patients match your search."
                  : "No patients assigned yet."}
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
