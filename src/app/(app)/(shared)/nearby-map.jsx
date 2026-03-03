import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";

import LeafletMap from "@/components/LeafletMap";
import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import {
  getDistanceKm,
  getLocationAddressLabel,
  normalizeLocation,
} from "@/utils/locationHelpers";
import { useOnlineUsers } from "@/utils/useOnlineUsers";

const MAP_TYPES = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];
const NEARBY_RADIUS_KM = 35;
const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function NearbyMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, batterySaver, refreshInterval } = useAppTheme();
  const { isUserOnline } = useOnlineUsers();
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [trailById, setTrailById] = useState({});
  const [mapType, setMapType] = useState("standard");
  const [showLinkedUsers, setShowLinkedUsers] = useState(true);
  const [showMedics, setShowMedics] = useState(true);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(true);

  const effectiveLiveUpdates = liveUpdates && !batterySaver;
  const effectiveInterval = refreshInterval || 15000;

  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const linkedQuery = useQuery({
    queryKey: ["linked-locations"],
    queryFn: () => apiClient.getLinkedLocations(),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });
  const medicsQuery = useQuery({
    queryKey: ["medics", "nearby-map"],
    queryFn: () => apiClient.getMedics({ limit: 200 }),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });
  const myLocation = useMemo(
    () => normalizeLocation(myLocationQuery.data?.location),
    [myLocationQuery.data],
  );
  const today = WEEK_DAYS[new Date().getDay()];
  const linked = useMemo(
    () =>
      (linkedQuery.data || [])
        .map((item) => ({
          ...item,
          location: normalizeLocation(item.location),
        }))
        .filter((item) => !!item.location),
    [linkedQuery.data],
  );
  const medics = useMemo(() => {
    const raw = medicsQuery.data?.items || medicsQuery.data || [];
    return raw
      .map((medic) => {
        const latCandidate = Number(
          medic?.locationLat ??
            medic?.locationCoordinates?.lat ??
            medic?.location?.lat ??
            medic?.location?.latitude,
        );
        const lngCandidate = Number(
          medic?.locationLng ??
            medic?.locationCoordinates?.lng ??
            medic?.location?.lng ??
            medic?.location?.longitude,
        );
        const location =
          Number.isFinite(latCandidate) && Number.isFinite(lngCandidate)
            ? normalizeLocation({
                latitude: latCandidate,
                longitude: lngCandidate,
                address: medic?.locationAddress || medic?.location?.address || medic?.location || "",
              })
            : null;
        const availabilityDays = Array.isArray(medic?.availabilityDays)
          ? medic.availabilityDays
          : Array.isArray(medic?.workingDays)
            ? medic.workingDays
            : [];
        const availableToday = availabilityDays.some(
          (day) => String(day || "").toLowerCase().trim() === today,
        );
        const online = isUserOnline(medic);
        const availableNow = online || availableToday;
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
        const isNear = distanceKm === null ? true : distanceKm <= NEARBY_RADIUS_KM;
        return {
          ...medic,
          location,
          availabilityDays,
          availableNow,
          isNear,
          distanceKm,
          online,
        };
      })
      .filter((medic) => medic.location);
  }, [isUserOnline, medicsQuery.data, myLocation, today]);
  const filteredMedics = useMemo(
    () =>
      medics.filter((medic) => {
        if (availableOnly && !medic.availableNow) return false;
        if (nearbyOnly && !medic.isNear) return false;
        return true;
      }),
    [availableOnly, medics, nearbyOnly],
  );

  useEffect(() => {
    if (!linked?.length) return;
    setTrailById((prev) => {
      const next = { ...prev };
      linked.forEach((item) => {
        if (
          !Number.isFinite(Number(item.location?.latitude)) ||
          !Number.isFinite(Number(item.location?.longitude))
        ) {
          return;
        }
        const trail = next[item.id] || [];
        const updated = [
          ...trail,
          { latitude: item.location.latitude, longitude: item.location.longitude },
        ];
        next[item.id] = updated.slice(-12);
      });
      return next;
    });
  }, [linked]);

  const region = useMemo(() => {
    if (myLocation?.latitude && myLocation?.longitude) {
      return {
        latitude: Number(myLocation.latitude),
        longitude: Number(myLocation.longitude),
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    const first = linked.find(
      (item) =>
        Number.isFinite(Number(item.location?.latitude)) &&
        Number.isFinite(Number(item.location?.longitude)),
    );
    const firstMedic = filteredMedics.find(
      (item) =>
        Number.isFinite(Number(item.location?.latitude)) &&
        Number.isFinite(Number(item.location?.longitude)),
    );
    const fallback = first || firstMedic;
    if (!fallback) {
      return {
        latitude: -1.2921,
        longitude: 36.8219,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    return {
      latitude: fallback.location.latitude,
      longitude: fallback.location.longitude,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [filteredMedics, linked, myLocation]);
  const linkedMarkers = useMemo(
    () =>
      linked
        .filter(
          (item) =>
            Number.isFinite(Number(item.location?.latitude)) &&
            Number.isFinite(Number(item.location?.longitude)),
        )
        .map((item) => ({
          id: item.id,
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          title: item.name || item.role,
          description: `${getLocationAddressLabel(item.location) || item.role} • ${isUserOnline(item) ? "Online" : "Offline"}`,
          color: isUserOnline(item) ? "#22C55E" : theme.primary,
          label: "➤",
        })),
    [isUserOnline, linked, theme.primary],
  );
  const medicMarkers = useMemo(
    () =>
      filteredMedics.map((medic) => ({
        id: `medic-${medic.id || medic.medicId}`,
        latitude: medic.location.latitude,
        longitude: medic.location.longitude,
        title: medic.name || "Medic",
        description: [
          medic.specialization || "General",
          medic.distanceKm !== null && Number.isFinite(medic.distanceKm)
            ? `${medic.distanceKm.toFixed(1)} km`
            : null,
          medic.availableNow ? "Available now" : "Currently unavailable",
        ]
          .filter(Boolean)
          .join(" • "),
        color: medic.availableNow ? "#22C55E" : "#F59E0B",
        label: "M",
      })),
    [filteredMedics],
  );
  const markers = useMemo(() => {
    const merged = [];
    if (showLinkedUsers) merged.push(...linkedMarkers);
    if (showMedics) merged.push(...medicMarkers);
    return merged;
  }, [linkedMarkers, medicMarkers, showLinkedUsers, showMedics]);
  const polylines = useMemo(
    () =>
      Object.entries(trailById)
        .filter(([, points]) => Array.isArray(points) && points.length > 1)
        .map(([id, points]) => ({
          id,
          coordinates: points,
          color: theme.primary,
          width: 2,
        })),
    [theme.primary, trailById],
  );

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
            Nearby Medics & Users
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Live updates {batterySaver ? "(battery saver)" : ""}
          </Text>
          <Switch
            value={effectiveLiveUpdates}
            onValueChange={setLiveUpdates}
            disabled={batterySaver}
            thumbColor={effectiveLiveUpdates ? theme.primary : theme.border}
            trackColor={{ true: `${theme.primary}66`, false: theme.border }}
          />
        </View>
        <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Map style
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
        </View>
        <View style={{ paddingHorizontal: 24, marginBottom: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <TouchableOpacity
            onPress={() => setShowLinkedUsers((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: showLinkedUsers ? `${theme.primary}1F` : theme.surface,
              borderWidth: 1,
              borderColor: showLinkedUsers ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: showLinkedUsers ? theme.primary : theme.textSecondary }}>
              Linked Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMedics((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: showMedics ? `${theme.primary}1F` : theme.surface,
              borderWidth: 1,
              borderColor: showMedics ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: showMedics ? theme.primary : theme.textSecondary }}>
              Medics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAvailableOnly((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: availableOnly ? `${theme.success}1F` : theme.surface,
              borderWidth: 1,
              borderColor: availableOnly ? theme.success : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: availableOnly ? theme.success : theme.textSecondary }}>
              Available Medics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNearbyOnly((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: nearbyOnly ? `${theme.warning}1F` : theme.surface,
              borderWidth: 1,
              borderColor: nearbyOnly ? theme.warning : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: nearbyOnly ? theme.warning : theme.textSecondary }}>
              Near ({NEARBY_RADIUS_KM}km)
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Showing {showMedics ? filteredMedics.length : 0} medics on map
          </Text>
        </View>

        {linkedQuery.isLoading || medicsQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
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
              zoom={12}
              markers={markers}
              polylines={showLinkedUsers ? polylines : []}
              mapType={mapType}
              interactive
            />
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
