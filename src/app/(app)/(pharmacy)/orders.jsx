import React, { useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ArrowLeft, Check, X, MapPin, Package, Pill } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { getPharmacyProfileCompletion } from "@/utils/pharmacyProfileCompletion";
import LocationPreview from "@/components/LocationPreview";
import { getDistanceKm } from "@/utils/locationHelpers";
import { resolveMediaUrl } from "@/utils/media";
import { useAuthStore } from "@/utils/auth/store";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";

export default function PharmacyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, refreshInterval, batterySaver } = useAppTheme();
  const { showToast } = useToast();
  const { profile } = usePharmacyProfile();
  const { auth } = useAuthStore();
  const role = String(auth?.user?.role || "").toUpperCase();
  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();
  const completion = useMemo(
    () => getPharmacyProfileCompletion(profile),
    [profile],
  );
  const isProfileComplete = completion.percent >= 99;

  const ordersQuery = useQuery({
    queryKey: ["pharmacy-orders"],
    queryFn: () => apiClient.getOrders(),
  });

  const ordersRaw = ordersQuery.data?.items || ordersQuery.data || [];
  const scopedOrdersRaw = useMemo(() => {
    if (role !== "SUPER_ADMIN") return ordersRaw;
    if (!pharmacyId) return [];
    return ordersRaw.filter((order) => String(order?.pharmacyId || "") === String(pharmacyId));
  }, [ordersRaw, role, pharmacyId]);
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
  const orders = myLocation
    ? [...scopedOrdersRaw].sort((a, b) => {
        const aLoc = linkedMap[a.patientId || a.patient_id];
        const bLoc = linkedMap[b.patientId || b.patient_id];
        const aDist = getDistanceKm(myLocation, aLoc);
        const bDist = getDistanceKm(myLocation, bLoc);
        if (aDist == null && bDist == null) return 0;
        if (aDist == null) return 1;
        if (bDist == null) return -1;
        return aDist - bDist;
      })
    : scopedOrdersRaw;

  const handleAction = (actionName) => {
    if (!isProfileComplete) {
      showToast(
        "Please complete your profile before processing orders.",
        "warning",
      );
      return;
    }
    showToast(`Order ${actionName.toLowerCase()}d.`, "success");
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
            Orders
          </Text>
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
            message={`Profile completion is ${completion.percent}%. Order processing unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(pharmacy)/edit-profile")}
          />
        )}

        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || `order-${index}`}
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
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
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
                    Order #{item.id || "--"}
                  </Text>
                  {(() => {
                    const targetId = item.patientId || item.patient_id;
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
                  {item.items?.length || 0} items • KES {item.total || "--"}
                </Text>
                {item.requiresPrescription || item.prescriptionId || item.prescription?.id ? (
                  <View
                    style={{
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: `${theme.warning}55`,
                      backgroundColor: `${theme.warning}12`,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                      <Pill color={theme.warning} size={14} />
                      <Text
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          fontFamily: "Inter_700Bold",
                          color: theme.warning,
                        }}
                      >
                        Prescription Order
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      ID: {item.prescription?.id || item.prescriptionId || "Required"}
                    </Text>
                    {item.prescription?.medicName ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                        Issued by: {item.prescription.medicName}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {Array.isArray(item.items) && item.items.length > 0 ? (
                  <View style={{ marginBottom: 10, gap: 8 }}>
                    {item.items.slice(0, 3).map((product, idx) => (
                      <View
                        key={`${item.id || "order"}-${product.id || product.productId || idx}`}
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: theme.surface,
                            marginRight: 8,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {product.imageUrl || product.image || product.photoUrl ? (
                            <Image
                              source={{ uri: resolveMediaUrl(product.imageUrl || product.image || product.photoUrl) }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Package color={theme.iconColor} size={14} />
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>
                          {product.name || product.productName || "Product"} x
                          {product.quantity ?? product.qty ?? 1}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.success}15`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleAction("Approve")}
                  >
                    <Check color={theme.success} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.success,
                        marginLeft: 6,
                      }}
                    >
                      Approve
                    </Text>
                  </TouchableOpacity>

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
                        params: { targetId: item.patientId || item.patient_id, title: "Patient Location" },
                      })
                    }
                  >
                    <MapPin color={theme.textSecondary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Location
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.error}15`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleAction("Decline")}
                  >
                    <X color={theme.error} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.error,
                        marginLeft: 6,
                      }}
                    >
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.patientId || item.patient_id ? (
                  <LocationPreview
                    targetId={item.patientId || item.patient_id}
                    theme={theme}
                    isDark={isDark}
                    height={80}
                  />
                ) : null}
              </View>
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
                No orders yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
