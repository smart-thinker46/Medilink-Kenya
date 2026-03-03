import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import * as ExpoLocation from "expo-location";
import { MapPin, Navigation } from "lucide-react-native";

import LeafletMap from "@/components/LeafletMap";
import Input from "@/components/Input";
import { useAppTheme } from "@/components/ThemeProvider";

const MAP_TYPES = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildAddress = (item = {}) =>
  item.formattedAddress ||
  [
    item.name,
    item.street,
    item.district,
    item.city || item.subregion,
    item.region,
    item.country,
  ]
    .filter(Boolean)
    .join(", ");

export default function LocationPickerField({
  address,
  lat,
  lng,
  onChange,
  title = "Location",
}) {
  const { theme, isDark } = useAppTheme();
  const [searchText, setSearchText] = useState(address || "");
  const [busy, setBusy] = useState(false);
  const [mapType, setMapType] = useState("standard");

  useEffect(() => {
    setSearchText(address || "");
  }, [address]);

  useEffect(() => {
    const query = String(searchText || "").trim();
    if (query.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await ExpoLocation.geocodeAsync(query);
        const first = result?.[0];
        if (!first || cancelled) return;
        const nextLat = Number(first.latitude);
        const nextLng = Number(first.longitude);
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
        const nextAddress = await reverseAddress(nextLat, nextLng);
        if (cancelled) return;
        commit({ nextAddress: nextAddress || query, nextLat, nextLng });
      } catch {
        // Ignore auto-search failures and allow manual search button fallback.
      }
    }, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText]);

  const latitude = toNumber(lat);
  const longitude = toNumber(lng);

  const region = useMemo(
    () => ({
      latitude: latitude ?? -1.2921,
      longitude: longitude ?? 36.8219,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    }),
    [latitude, longitude],
  );

  const commit = ({ nextAddress, nextLat, nextLng }) => {
    onChange?.({
      locationAddress: nextAddress || "",
      locationLat:
        typeof nextLat === "number" && Number.isFinite(nextLat)
          ? String(nextLat)
          : "",
      locationLng:
        typeof nextLng === "number" && Number.isFinite(nextLng)
          ? String(nextLng)
          : "",
    });
  };

  const reverseAddress = async (nextLat, nextLng) => {
    try {
      const items = await ExpoLocation.reverseGeocodeAsync({
        latitude: nextLat,
        longitude: nextLng,
      });
      return buildAddress(items?.[0] || {});
    } catch {
      return "";
    }
  };

  const handleSearch = async () => {
    const query = String(searchText || "").trim();
    if (!query) {
      Alert.alert("Missing Location", "Enter a location name to search.");
      return;
    }
    setBusy(true);
    try {
      const result = await ExpoLocation.geocodeAsync(query);
      const first = result?.[0];
      if (!first) {
        Alert.alert("Not Found", "No matching location found.");
        return;
      }
      const nextLat = Number(first.latitude);
      const nextLng = Number(first.longitude);
      const resolved = await reverseAddress(nextLat, nextLng);
      const nextAddress = resolved || query;
      setSearchText(nextAddress);
      commit({ nextAddress, nextLat, nextLng });
    } catch (error) {
      Alert.alert("Search Failed", error?.message || "Unable to search location.");
    } finally {
      setBusy(false);
    }
  };

  const handleUseCurrent = async () => {
    setBusy(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission was denied.");
        return;
      }
      const current = await ExpoLocation.getCurrentPositionAsync({});
      const nextLat = Number(current.coords.latitude);
      const nextLng = Number(current.coords.longitude);
      const nextAddress = await reverseAddress(nextLat, nextLng);
      setSearchText(nextAddress || searchText);
      commit({ nextAddress, nextLat, nextLng });
    } catch (error) {
      Alert.alert(
        "Location Error",
        error?.message || "Unable to fetch current location.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMapPress = async (coordinate) => {
    const nextLat = Number(coordinate?.latitude);
    const nextLng = Number(coordinate?.longitude);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    const nextAddress = await reverseAddress(nextLat, nextLng);
    setSearchText(nextAddress || "");
    commit({ nextAddress, nextLat, nextLng });
  };

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <MapPin color={theme.primary} size={18} />
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginLeft: 8,
          }}
        >
          {title}
        </Text>
      </View>

      <Input
        label="Search Location"
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search town, estate, street..."
      />

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 11,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: "row",
            justifyContent: "center",
          }}
          onPress={handleSearch}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Navigation color={theme.textSecondary} size={14} />
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 12,
              marginLeft: 6,
              fontFamily: "Inter_500Medium",
            }}
          >
            {busy ? "Searching..." : "Search"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 11,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={handleUseCurrent}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 12,
              fontFamily: "Inter_500Medium",
            }}
          >
            Use Current
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
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
                color: mapType === option.id ? theme.primary : theme.textSecondary,
                fontSize: 11,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={{
          height: 220,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <LeafletMap
          center={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
          zoom={14}
          mapType={mapType}
          markers={
            typeof latitude === "number" && typeof longitude === "number"
              ? [
                  {
                    id: "selected",
                    latitude,
                    longitude,
                    title: title || "Location",
                    description: address || "",
                  },
                ]
              : []
          }
          onPress={handleMapPress}
          interactive
        />
      </View>

      <Input
        label="Location Address"
        value={address || ""}
        onChangeText={(value) =>
          onChange?.({
            locationAddress: value,
            locationLat: lat || "",
            locationLng: lng || "",
          })
        }
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Input
          label="Latitude"
          value={lat || ""}
          onChangeText={(value) =>
            onChange?.({
              locationAddress: address || "",
              locationLat: value,
              locationLng: lng || "",
            })
          }
          keyboardType="numeric"
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="Longitude"
          value={lng || ""}
          onChangeText={(value) =>
            onChange?.({
              locationAddress: address || "",
              locationLat: lat || "",
              locationLng: value,
            })
          }
          keyboardType="numeric"
          containerStyle={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
