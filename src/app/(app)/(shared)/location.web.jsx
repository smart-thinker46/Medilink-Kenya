import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MapPin, Navigation } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import LeafletMap from "@/components/LeafletMap";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import {
  getExternalMapUrl,
  getLocationAddressLabel,
  normalizeLocation,
} from "@/utils/locationHelpers";

const MAP_TYPES = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

export default function LocationWebScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
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

  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      setLoading(true);
      try {
        const response = targetId
          ? await apiClient.getUserLocation(targetId)
          : await apiClient.getMyLocation();
        if (!mounted) return;
        const normalized = normalizeLocation(response?.location);
        setLocation(normalized);
        if (!targetId && normalized?.address) {
          setLocationQuery(String(normalized.address));
        }
      } catch (error) {
        if (!mounted) return;
        showToast(error.message || "Failed to load location.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLocation();
    return () => {
      mounted = false;
    };
  }, [targetId, showToast]);

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
            lat: items[0].latitude,
            lng: items[0].longitude,
            address: items[0].label,
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

  const handleUseCurrent = () => {
    if (!navigator?.geolocation) {
      showToast("Browser geolocation is unavailable.", "warning");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((prev) => ({
          ...(prev || {}),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: prev?.address || "",
          precision: "approx",
          updatedAt: new Date().toISOString(),
        }));
      },
      () => {
        showToast("Location permission denied in browser.", "warning");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const handleSearchLocation = async () => {
    const query = String(locationQuery || "").trim();
    if (!query) {
      showToast("Type a location first.", "warning");
      return;
    }
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
      });
      const data = await response.json();
      const best = Array.isArray(data) ? data[0] : null;
      if (!best) {
        showToast("No matching location found.", "warning");
        return;
      }
      const latitude = Number(best.lat);
      const longitude = Number(best.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        showToast("Invalid location result.", "error");
        return;
      }
      setLocation((prev) => ({
        ...(prev || {}),
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        address: best.display_name || query,
        precision: "approx",
        updatedAt: new Date().toISOString(),
      }));
      showToast("Location found. Save to apply.", "success");
    } catch {
      showToast("Failed to search location.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handlePickSuggestion = (item) => {
    setLocationQuery(item.label);
    setLocation((prev) => ({
      ...(prev || {}),
      latitude: item.latitude,
      longitude: item.longitude,
      lat: item.latitude,
      lng: item.longitude,
      address: item.label,
      precision: "approx",
      updatedAt: new Date().toISOString(),
    }));
    setSuggestions([]);
  };

  const handleMapPress = async (coords) => {
    if (isReadOnly) return;
    const latitude = Number(coords?.latitude);
    const longitude = Number(coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setLocation((prev) => ({
      ...(prev || {}),
      latitude,
      longitude,
      lat: latitude,
      lng: longitude,
      address: prev?.address || locationQuery || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      precision: "approx",
      updatedAt: new Date().toISOString(),
    }));

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await response.json();
      const label = String(data?.display_name || "").trim();
      if (!label) return;
      setLocationQuery(label);
      setLocation((prev) => ({
        ...(prev || {}),
        address: label,
      }));
    } catch {
      // Ignore reverse geocoding errors and keep selected coordinates.
    }
  };

  const handleSave = async () => {
    if (!location?.latitude || !location?.longitude) {
      showToast("Pick your location first.", "warning");
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

  const handleOpenInMaps = async () => {
    const url = getExternalMapUrl(location, title || "Location");
    if (!url) {
      showToast("No location available yet.", "warning");
      return;
    }
    await Linking.openURL(url);
  };

  const handleShare = async () => {
    const url = getExternalMapUrl(location, title || "Location");
    if (!url) {
      showToast("No location available yet.", "warning");
      return;
    }
    if (navigator?.share) {
      try {
        await navigator.share({
          title: title || "Location",
          text: "Location link",
          url,
        });
        return;
      } catch {}
    }
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        showToast("Location link copied.", "success");
        return;
      } catch {}
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 12,
              borderRadius: 16,
              padding: 20,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
            }}
          >
            {!isReadOnly && (
              <View style={{ width: "100%", marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.surface,
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
                      paddingVertical: 11,
                      color: theme.text,
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
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                Map style
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                {MAP_TYPES.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setMapType(option.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: mapType === option.id ? `${theme.primary}1F` : theme.surface,
                      borderWidth: 1,
                      borderColor: mapType === option.id ? theme.primary : theme.border,
                    }}
                    activeOpacity={0.85}
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
                  width: "100%",
                  height: 260,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <LeafletMap
                  center={{
                    latitude: Number(location?.latitude) || -1.2921,
                    longitude: Number(location?.longitude) || 36.8219,
                  }}
                  zoom={location?.latitude && location?.longitude ? 14 : 11}
                  markers={
                    location?.latitude && location?.longitude
                      ? [
                          {
                            id: "selected-location",
                            latitude: Number(location.latitude),
                            longitude: Number(location.longitude),
                            title: isReadOnly ? "Saved location" : "Selected location",
                            description: getLocationAddressLabel(location),
                            color: theme.primary,
                            label: "📍",
                          },
                        ]
                      : []
                  }
                  mapType={mapType}
                  interactive={!isReadOnly}
                  onPress={handleMapPress}
                />
              </View>
              {!isReadOnly && (
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  Tip: click on map to set location quickly.
                </Text>
              )}
            </View>
            <MapPin color={theme.primary} size={32} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 14,
                textAlign: "center",
                color: theme.textSecondary,
                lineHeight: 20,
              }}
            >
              {location
                ? `Address: ${getLocationAddressLabel(location)}`
                : "No saved location yet."}
            </Text>
            {location ? (
              <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={handleOpenInMaps}
              style={{
                marginTop: 14,
                width: "100%",
                borderRadius: 12,
                paddingVertical: 11,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Navigation color={theme.textSecondary} size={14} />
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 8 }}>
                Open in Maps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={{
                marginTop: 10,
                width: "100%",
                borderRadius: 12,
                paddingVertical: 11,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Share Location
              </Text>
            </TouchableOpacity>
            {!isReadOnly && (
              <>
                <TouchableOpacity
                  onPress={handleUseCurrent}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    borderRadius: 12,
                    paddingVertical: 11,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Use Browser Location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    borderRadius: 12,
                    paddingVertical: 11,
                    backgroundColor: theme.primary,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                    {saving ? "Saving..." : "Save Location"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
