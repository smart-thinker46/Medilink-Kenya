import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";

import LeafletMap from "@/components/LeafletMap";
import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
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

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

export default function NearbyMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, batterySaver, refreshInterval } = useAppTheme();
  const { showToast } = useToast();
  const { isUserOnline } = useOnlineUsers();
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [trailById, setTrailById] = useState({});
  const [mapType, setMapType] = useState("standard");
  const [showLinkedUsers, setShowLinkedUsers] = useState(true);
  const [showMedics, setShowMedics] = useState(true);
  const [showPharmacies, setShowPharmacies] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(true);

  const effectiveLiveUpdates = liveUpdates && !batterySaver;
  const effectiveInterval = refreshInterval || 15000;

  const myLocationQuery = useQuery({
    queryKey: ["my-location", "nearby-map"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const linkedQuery = useQuery({
    queryKey: ["linked-locations", "nearby-map"],
    queryFn: () => apiClient.getLinkedLocations(),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });
  const discoveryQuery = useQuery({
    queryKey: ["map-discovery", "nearby-map"],
    queryFn: () =>
      apiClient.getMapDiscovery({
        include: "medic,pharmacy,hospital",
      }),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });

  const myLocation = useMemo(
    () => normalizeLocation(myLocationQuery.data?.location),
    [myLocationQuery.data],
  );

  const linked = useMemo(
    () =>
      (linkedQuery.data || [])
        .map((item) => ({
          ...item,
          location: normalizeLocation(item.location),
          role: normalizeRole(item.role),
        }))
        .filter((item) => !!item.location),
    [linkedQuery.data],
  );

  const discovery = useMemo(() => {
    const rows = discoveryQuery.data?.items || [];
    return rows
      .map((entity) => {
        const role = normalizeRole(entity?.role);
        const location = normalizeLocation(entity?.location);
        if (!location) return null;
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
        const online = isUserOnline(entity);
        const isNear = distanceKm === null ? true : distanceKm <= NEARBY_RADIUS_KM;
        return {
          ...entity,
          role,
          location,
          online,
          isNear,
          distanceKm,
          availableNow: role === "MEDIC" ? online : true,
        };
      })
      .filter(Boolean);
  }, [discoveryQuery.data, isUserOnline, myLocation]);

  const visibleDiscovery = useMemo(
    () =>
      discovery.filter((entity) => {
        if (entity.role === "MEDIC" && !showMedics) return false;
        if (entity.role === "PHARMACY_ADMIN" && !showPharmacies) return false;
        if (entity.role === "HOSPITAL_ADMIN" && !showHospitals) return false;
        if (nearbyOnly && !entity.isNear) return false;
        if (availableOnly && entity.role === "MEDIC" && !entity.availableNow) return false;
        return true;
      }),
    [availableOnly, discovery, nearbyOnly, showHospitals, showMedics, showPharmacies],
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
    const firstLinked = linked.find(
      (item) =>
        Number.isFinite(Number(item.location?.latitude)) &&
        Number.isFinite(Number(item.location?.longitude)),
    );
    const firstDiscovery = visibleDiscovery.find(
      (item) =>
        Number.isFinite(Number(item.location?.latitude)) &&
        Number.isFinite(Number(item.location?.longitude)),
    );
    const fallback = firstLinked || firstDiscovery;
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
  }, [linked, myLocation, visibleDiscovery]);

  const linkedMarkers = useMemo(
    () =>
      linked
        .filter(
          (item) =>
            Number.isFinite(Number(item.location?.latitude)) &&
            Number.isFinite(Number(item.location?.longitude)),
        )
        .map((item) => ({
          id: `linked-${item.id}`,
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          title: item.name || item.role,
          description: `${getLocationAddressLabel(item.location) || item.role} • ${isUserOnline(item) ? "Online" : "Offline"}`,
          color: isUserOnline(item) ? "#22C55E" : theme.primary,
          label: "➤",
        })),
    [isUserOnline, linked, theme.primary],
  );

  const discoveryMarkers = useMemo(
    () =>
      visibleDiscovery.map((entity) => {
        const role = normalizeRole(entity.role);
        const label =
          role === "MEDIC"
            ? "M"
            : role === "PHARMACY_ADMIN"
              ? "P"
              : role === "HOSPITAL_ADMIN"
                ? "H"
                : "U";
        const color =
          role === "MEDIC"
            ? entity.availableNow
              ? "#22C55E"
              : "#F59E0B"
            : role === "PHARMACY_ADMIN"
              ? "#2563EB"
              : role === "HOSPITAL_ADMIN"
                ? "#0EA5A4"
                : theme.primary;
        const description = [
          role === "MEDIC" ? entity.specialization || "General practice" : null,
          entity.distanceKm !== null && Number.isFinite(entity.distanceKm)
            ? `${entity.distanceKm.toFixed(1)} km`
            : null,
          getLocationAddressLabel(entity.location),
        ]
          .filter(Boolean)
          .join(" • ");
        return {
          id: `discovery-${entity.userId}`,
          latitude: entity.location.latitude,
          longitude: entity.location.longitude,
          title: entity.name || "Provider",
          description,
          color,
          label,
        };
      }),
    [theme.primary, visibleDiscovery],
  );

  const markerLookup = useMemo(() => {
    const map = new Map();
    linked.forEach((item) => {
      map.set(`linked-${item.id}`, {
        type: "linked",
        item,
      });
    });
    discovery.forEach((item) => {
      map.set(`discovery-${item.userId}`, {
        type: "discovery",
        item,
      });
    });
    return map;
  }, [discovery, linked]);

  const markers = useMemo(() => {
    const merged = [];
    if (showLinkedUsers) merged.push(...linkedMarkers);
    merged.push(...discoveryMarkers);
    return merged;
  }, [discoveryMarkers, linkedMarkers, showLinkedUsers]);

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

  const handleMarkerPress = (payload) => {
    const markerId = String(payload?.markerId || "").trim();
    if (!markerId) return;
    const match = markerLookup.get(markerId);
    if (!match) return;
    const item = match.item || {};
    const role = normalizeRole(item.role);
    if (!["MEDIC", "PHARMACY_ADMIN", "HOSPITAL_ADMIN"].includes(role)) {
      showToast("Profile for this marker is not available.", "warning");
      return;
    }
    router.push({
      pathname: "/(app)/(shared)/entity-profile",
      params: {
        userId: String(item.userId || item.id || ""),
        role,
      },
    });
  };

  const isLoading =
    linkedQuery.isLoading ||
    discoveryQuery.isLoading ||
    myLocationQuery.isLoading;

  const medicCount = visibleDiscovery.filter((item) => item.role === "MEDIC").length;
  const pharmacyCount = visibleDiscovery.filter((item) => item.role === "PHARMACY_ADMIN").length;
  const hospitalCount = visibleDiscovery.filter((item) => item.role === "HOSPITAL_ADMIN").length;

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
            Nearby Providers & Facilities
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
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>Map style</Text>
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
            onPress={() => setShowPharmacies((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: showPharmacies ? `${theme.primary}1F` : theme.surface,
              borderWidth: 1,
              borderColor: showPharmacies ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: showPharmacies ? theme.primary : theme.textSecondary }}>
              Pharmacies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowHospitals((prev) => !prev)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: showHospitals ? `${theme.primary}1F` : theme.surface,
              borderWidth: 1,
              borderColor: showHospitals ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontSize: 11, color: showHospitals ? theme.primary : theme.textSecondary }}>
              Hospitals
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
            Showing {medicCount} medics, {pharmacyCount} pharmacies, {hospitalCount} hospitals
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
            Tap a marker to open provider/facility profile and actions.
          </Text>
        </View>

        {isLoading ? (
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
              onMarkerPress={handleMarkerPress}
            />
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
