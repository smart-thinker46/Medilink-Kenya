import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, MapPin, Search } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { getDistanceKm, getLocationAddressLabel, normalizeLocation } from "@/utils/locationHelpers";

export default function HospitalServicesSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [serviceQuery, setServiceQuery] = useState("");

  const myLocationQuery = useQuery({
    queryKey: ["my-location", "hospital-services"],
    queryFn: () => apiClient.getMyLocation(),
  });

  const discoveryQuery = useQuery({
    queryKey: ["map-discovery", "hospital-services", serviceQuery],
    queryFn: () =>
      apiClient.getMapDiscovery({
        include: "hospital",
        service: serviceQuery.trim() || undefined,
      }),
  });

  const myLocation = useMemo(
    () => normalizeLocation(myLocationQuery.data?.location),
    [myLocationQuery.data],
  );

  const hospitals = useMemo(() => {
    const items = discoveryQuery.data?.items || [];
    return items
      .map((item) => {
        const location = normalizeLocation(item.location);
        const distanceKm =
          myLocation && location
            ? getDistanceKm(
                {
                  latitude: Number(myLocation.latitude),
                  longitude: Number(myLocation.longitude),
                },
                {
                  latitude: Number(location.latitude),
                  longitude: Number(location.longitude),
                },
              )
            : null;
        return {
          ...item,
          location,
          distanceKm,
        };
      })
      .filter((item) => item.location);
  }, [discoveryQuery.data, myLocation]);

  const isLoading = discoveryQuery.isLoading || myLocationQuery.isLoading;

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Hospital Services
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Search by service name
          </Text>
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 10,
            }}
          >
            <Search color={theme.textSecondary} size={18} />
            <TextInput
              placeholder="e.g. maternity, dialysis, radiology"
              placeholderTextColor={theme.textSecondary}
              value={serviceQuery}
              onChangeText={setServiceQuery}
              style={{
                flex: 1,
                paddingHorizontal: 8,
                paddingVertical: 10,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              }}
            />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} size="large" />
        ) : hospitals.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>
            No hospitals match that service yet.
          </Text>
        ) : (
          hospitals.map((hospital) => {
            const services = Array.isArray(hospital.services) ? hospital.services : [];
            return (
              <TouchableOpacity
                key={hospital.userId || hospital.id}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(shared)/entity-profile",
                    params: { userId: String(hospital.userId || hospital.id), role: "HOSPITAL_ADMIN" },
                  })
                }
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderTopWidth: isDark ? 0 : 1.5,
                  borderTopColor: isDark ? theme.border : theme.accent,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Building2 color={theme.primary} size={18} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                      flex: 1,
                    }}
                  >
                    {hospital.name || "Hospital"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <MapPin color={theme.textSecondary} size={14} />
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>
                    {getLocationAddressLabel(hospital.location)}
                  </Text>
                  {hospital.distanceKm !== null && Number.isFinite(hospital.distanceKm) ? (
                    <Text style={{ marginLeft: 8, color: theme.textSecondary, fontSize: 12 }}>
                      • {hospital.distanceKm.toFixed(1)} km
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Services: {services.length ? services.slice(0, 5).join(", ") : "Not listed yet"}
                  {services.length > 5 ? "..." : ""}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
