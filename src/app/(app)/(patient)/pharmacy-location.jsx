import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MapPin, Navigation } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import LeafletMap from "@/components/LeafletMap";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import {
  normalizeLocation,
  getExternalMapUrl,
  getLocationAddressLabel,
} from "@/utils/locationHelpers";

const MAP_TYPES = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

export default function PharmacyLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const pharmacyName =
    typeof params?.pharmacy === "string" && params.pharmacy
      ? params.pharmacy
      : "Pharmacy";
  const pharmacyId =
    (typeof params?.pharmacyId === "string" && params.pharmacyId) ||
    (typeof params?.targetId === "string" && params.targetId) ||
    "";

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [mapType, setMapType] = useState("standard");

  useEffect(() => {
    if (!pharmacyId) return;
    let mounted = true;
    setLoading(true);
    apiClient
      .getUserLocation(pharmacyId)
      .then((data) => {
        if (!mounted) return;
        setLocation(normalizeLocation(data?.location));
      })
      .catch((error) => {
        if (!mounted) return;
        showToast(error.message || "Failed to load pharmacy location.", "error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pharmacyId, showToast]);

  const region = useMemo(() => {
    const lat = location?.latitude || -1.2921;
    const lng = location?.longitude || 36.8219;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }, [location]);

  const handleOpenInMaps = async () => {
    const url = getExternalMapUrl(location, pharmacyName);
    if (!url) {
      showToast("No saved pharmacy coordinates found yet.", "warning");
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast("Unable to open maps on this device.", "error");
      return;
    }
    await Linking.openURL(url);
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
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {pharmacyName}
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, paddingHorizontal: 4 }}>
              {MAP_TYPES.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setMapType(option.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: mapType === option.id ? `${theme.primary}1F` : theme.surface,
                    borderWidth: 1,
                    borderColor: mapType === option.id ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: mapType === option.id ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View
              style={{
                borderRadius: 16,
                overflow: "hidden",
                flex: 1,
                minHeight: 320,
              }}
            >
              {location ? (
                <LeafletMap
                  center={{
                    latitude: region.latitude,
                    longitude: region.longitude,
                  }}
                  zoom={14}
                  markers={[
                    {
                      id: pharmacyId || "pharmacy",
                      latitude: location.latitude,
                      longitude: location.longitude,
                      title: pharmacyName,
                      description: getLocationAddressLabel(location),
                    },
                  ]}
                  mapType={mapType}
                  interactive
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surface,
                    paddingHorizontal: 20,
                  }}
                >
                  <MapPin color={theme.primary} size={28} />
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      textAlign: "center",
                      color: theme.textSecondary,
                    }}
                  >
                    No saved location found for this pharmacy yet.
                  </Text>
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 8, paddingTop: 12 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {location
                  ? `Address: ${getLocationAddressLabel(location)}`
                  : "Ask the pharmacy to set their location first."}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
                onPress={handleOpenInMaps}
              >
                <Navigation color="#FFFFFF" size={16} />
                <Text style={{ color: "#FFFFFF", marginLeft: 8, fontSize: 13 }}>
                  Open in Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
