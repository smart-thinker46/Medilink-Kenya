import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Linking, Share, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MapPin, Navigation } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

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

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const targetId =
    (typeof params?.targetId === "string" && params.targetId) ||
    (typeof params?.userId === "string" && params.userId) ||
    "";
  const title = typeof params?.title === "string" ? params.title : "";
  const isReadOnly = Boolean(targetId);

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [mapType, setMapType] = useState("standard");

  const ExpoLocation = Platform.OS === "web"
    ? null
    : require("expo-location");

  const fetchLocation = async () => {
    setLoading(true);
    try {
      const response = targetId
        ? await apiClient.getUserLocation(targetId)
        : await apiClient.getMyLocation();
      const normalized = normalizeLocation(response?.location);
      setLocation(normalized);
      if (!targetId && normalized?.address) {
        setLocationQuery(String(normalized.address));
      }
    } catch (error) {
      showToast(error.message || "Failed to load location.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [targetId]);

  useEffect(() => {
    if (isReadOnly) return;
    const query = String(locationQuery || "").trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const data = await response.json();
        if (cancelled) return;
        const items = (Array.isArray(data) ? data : [])
          .map((item) => ({
            id: String(item.place_id || `${item.lat}-${item.lon}`),
            label: String(item.display_name || query),
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }))
          .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
        setSuggestions(items);
        if (items[0]) {
          setLocation((prev) => ({
            ...(prev || {}),
            latitude: items[0].latitude,
            longitude: items[0].longitude,
            address: items[0].label,
            city: "",
            area: "",
            precision: "approx",
            updatedAt: new Date().toISOString(),
          }));
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locationQuery, isReadOnly]);

  const region = useMemo(() => {
    const lat = location?.latitude || -1.2921;
    const lng = location?.longitude || 36.8219;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [location]);

  const handleUseCurrent = async () => {
    if (Platform.OS === "web" || !ExpoLocation) {
      showToast("Use the map to pick a location on web.", "info");
      return;
    }
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showToast("Location permission denied.", "warning");
      return;
    }
    const current = await ExpoLocation.getCurrentPositionAsync({});
    const coords = current.coords;
    const address = await ExpoLocation.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    const info = address?.[0] || {};
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: info.street || info.name || "",
      city: info.city || info.subregion || "",
      area: info.region || "",
      precision: "approx",
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSearchLocation = async () => {
    const query = String(locationQuery || "").trim();
    if (!query) {
      showToast("Type a location first.", "warning");
      return;
    }
    if (Platform.OS === "web" || !ExpoLocation) {
      showToast("Location search is available on phone app.", "info");
      return;
    }
    setSearching(true);
    try {
      const results = await ExpoLocation.geocodeAsync(query);
      const best = results?.[0];
      if (!best) {
        showToast("No matching location found.", "warning");
        return;
      }
      let address = query;
      try {
        const reverse = await ExpoLocation.reverseGeocodeAsync({
          latitude: best.latitude,
          longitude: best.longitude,
        });
        const info = reverse?.[0] || {};
        address =
          [info.name, info.street, info.city, info.region]
            .filter(Boolean)
            .join(", ") || query;
      } catch {}
      setLocation({
        latitude: best.latitude,
        longitude: best.longitude,
        address,
        city: "",
        area: "",
        precision: "approx",
        updatedAt: new Date().toISOString(),
      });
      showToast("Location found. You can now save or share.", "success");
    } catch (error) {
      showToast(error?.message || "Failed to search location.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handlePickSuggestion = (item) => {
    setLocationQuery(item.label);
    setLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.label,
      city: "",
      area: "",
      precision: "approx",
      updatedAt: new Date().toISOString(),
    });
    setSuggestions([]);
  };

  const handleSave = async () => {
    if (
      !Number.isFinite(Number(location?.latitude)) ||
      !Number.isFinite(Number(location?.longitude))
    ) {
      showToast("Pick a location first.", "warning");
      return;
    }
    setSaving(true);
    try {
      await apiClient.updateMyLocation(location);
      queryClient.invalidateQueries({ queryKey: ["my-location"] });
      queryClient.invalidateQueries({ queryKey: ["linked-locations"] });
      showToast("Location saved.", "success");
    } catch (error) {
      showToast(error.message || "Failed to save location.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleShareLocation = async () => {
    const url = getExternalMapUrl(location, title || "My location");
    if (!url) {
      showToast("No location available yet.", "warning");
      return;
    }
    try {
      await Share.share({
        message: `My location: ${url}`,
        url,
        title: title || "Location",
      });
    } catch {
      showToast("Unable to share location.", "error");
    }
  };

  const handleOpenInMaps = async () => {
    const url = getExternalMapUrl(location, title || "Location");
    if (!url) {
      showToast("No location available yet.", "warning");
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
      <View style={{ flex: 1, paddingTop: insets.top + 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 16,
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
          <Text style={{ fontSize: 20, fontFamily: "Nunito_700Bold", color: theme.text }}>
            {title || (isReadOnly ? "View Location" : "Set Location")}
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <>
            <View style={{ marginHorizontal: 24, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {isReadOnly
                  ? "Approximate location shown."
                  : "Type your location or tap map to pin. Your position is saved approximately."}
              </Text>
            </View>
            {!isReadOnly && (
              <View style={{ marginHorizontal: 24, marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingHorizontal: 12,
                  }}
                >
                  <TextInput
                    value={locationQuery}
                    onChangeText={setLocationQuery}
                    placeholder="Type location (e.g. Nairobi CBD)"
                    placeholderTextColor={theme.textSecondary}
                    style={{
                      flex: 1,
                      color: theme.text,
                      paddingVertical: 12,
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleSearchLocation}
                    disabled={searching}
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                      {searching ? "..." : "Search"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {loadingSuggestions ? (
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                    Loading suggestions...
                  </Text>
                ) : null}
                {suggestions.length > 0 && (
                  <View
                    style={{
                      marginTop: 8,
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      overflow: "hidden",
                    }}
                  >
                    {suggestions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handlePickSuggestion(item)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 12, color: theme.text, fontFamily: "Inter_500Medium" }}
                        >
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                          {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View
              style={{
                marginHorizontal: 24,
                marginBottom: 12,
                flexDirection: "row",
                gap: 8,
              }}
            >
              {MAP_TYPES.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setMapType(option.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor:
                      mapType === option.id ? `${theme.primary}1F` : theme.surface,
                    borderWidth: 1,
                    borderColor: mapType === option.id ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Inter_600SemiBold",
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
                marginHorizontal: 24,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: theme.border,
                flex: 1,
                minHeight: 320,
              }}
            >
              <LeafletMap
                center={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                }}
                zoom={14}
                markers={
                  Number.isFinite(Number(location?.latitude)) &&
                  Number.isFinite(Number(location?.longitude))
                    ? [
                        {
                          id: "selected-location",
                          latitude: location.latitude,
                          longitude: location.longitude,
                          title: "Location",
                          description: location.address || "",
                        },
                      ]
                    : []
                }
                mapType={mapType}
                onPress={
                  isReadOnly
                    ? undefined
                    : async (coords) => {
                        if (
                          !Number.isFinite(Number(coords?.latitude)) ||
                          !Number.isFinite(Number(coords?.longitude))
                        ) {
                          return;
                        }
                        let address = "";
                        try {
                          const info = await ExpoLocation.reverseGeocodeAsync({
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                          });
                          const data = info?.[0] || {};
                          address = data.street || data.name || "";
                        } catch {
                          address = "";
                        }
                        setLocation((prev) => ({
                          ...(prev || {}),
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                          address,
                          precision: "approx",
                          updatedAt: new Date().toISOString(),
                        }));
                      }
                }
              />
            </View>

            {!isReadOnly && (
              <View style={{ paddingHorizontal: 24, paddingBottom: 24, marginTop: 12 }}>
                {location ? (
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                    Address: {getLocationAddressLabel(location)}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={handleOpenInMaps}
                >
                  <Navigation color={theme.textSecondary} size={14} />
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 8 }}>
                    Open in Maps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={handleShareLocation}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Share Location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={handleUseCurrent}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Use Current Location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <MapPin color="#FFFFFF" size={16} />
                  <Text style={{ color: "#FFFFFF", marginLeft: 8, fontSize: 13 }}>
                    {saving ? "Saving..." : "Save Location"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {isReadOnly && location ? (
              <View style={{ paddingHorizontal: 24, paddingBottom: 24, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Address: {getLocationAddressLabel(location)}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    marginTop: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={handleOpenInMaps}
                >
                  <Navigation color={theme.textSecondary} size={14} />
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 8 }}>
                    Open in Maps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    marginTop: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={handleShareLocation}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Share Location
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </View>
    </ScreenLayout>
  );
}
