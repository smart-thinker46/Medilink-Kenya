import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Switch } from "react-native";
import { useQuery } from "@tanstack/react-query";

import LeafletMap from "@/components/LeafletMap";
import apiClient from "@/utils/api";
import { useAppTheme } from "@/components/ThemeProvider";
import {
  getDistanceKm,
  getLocationAddressLabel,
  normalizeLocation,
} from "@/utils/locationHelpers";

export default function LocationPreview({
  targetId,
  theme,
  isDark,
  height = 90,
  showDistance = true,
  refetchInterval = 15000,
  showLiveToggle = true,
}) {
  const { batterySaver, refreshInterval } = useAppTheme();
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [trail, setTrail] = useState([]);
  const [cachedDistance, setCachedDistance] = useState(null);

  const effectiveLiveUpdates = liveUpdates && !batterySaver;
  const effectiveInterval = refreshInterval || refetchInterval;

  const myLocationQuery = useQuery({
    queryKey: ["my-location"],
    queryFn: () => apiClient.getMyLocation(),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });

  const targetLocationQuery = useQuery({
    queryKey: ["user-location", targetId],
    queryFn: () => apiClient.getUserLocation(targetId),
    enabled: Boolean(targetId),
    refetchInterval: effectiveLiveUpdates ? effectiveInterval : false,
  });

  const myLocation = normalizeLocation(myLocationQuery.data?.location);
  const targetLocation = normalizeLocation(targetLocationQuery.data?.location);

  const region = useMemo(() => {
    const lat = targetLocation?.latitude || -1.2921;
    const lng = targetLocation?.longitude || 36.8219;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [targetLocation]);

  const distanceKm = useMemo(() => {
    if (!showDistance) return null;
    if (!myLocation || !targetLocation) return null;
    return getDistanceKm(myLocation, targetLocation);
  }, [myLocation, targetLocation, showDistance]);

  const etaMinutes = useMemo(() => {
    if (distanceKm == null) return null;
    const avgSpeedKmh = 30;
    return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
  }, [distanceKm]);
  const markers = useMemo(
    () =>
      Number.isFinite(Number(targetLocation?.latitude)) &&
      Number.isFinite(Number(targetLocation?.longitude))
        ? [
            {
              id: "target-location",
              latitude: targetLocation.latitude,
              longitude: targetLocation.longitude,
              title: "Location",
              description: getLocationAddressLabel(targetLocation),
              color: theme.primary,
              label: "➤",
            },
          ]
        : [],
    [targetLocation, theme.primary],
  );
  const polylines = useMemo(
    () =>
      trail.length > 1
        ? [
            {
              id: "trail",
              coordinates: trail,
              color: theme.primary,
              width: 2,
            },
          ]
        : [],
    [theme.primary, trail],
  );

  useEffect(() => {
    if (
      !Number.isFinite(Number(targetLocation?.latitude)) ||
      !Number.isFinite(Number(targetLocation?.longitude))
    ) {
      return;
    }
    setTrail((prev) => {
      const next = [
        ...prev,
        { latitude: targetLocation.latitude, longitude: targetLocation.longitude },
      ];
      return next.slice(-12);
    });
  }, [targetLocation?.latitude, targetLocation?.longitude]);

  useEffect(() => {
    if (distanceKm != null) {
      setCachedDistance(distanceKm);
    }
  }, [distanceKm]);

  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <LeafletMap
        style={{ height }}
        center={{
          latitude: region.latitude,
          longitude: region.longitude,
        }}
        zoom={13}
        markers={markers}
        polylines={polylines}
        interactive={false}
      />
      <View style={{ padding: 8, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
          {getLocationAddressLabel(targetLocation)}
        </Text>
        {cachedDistance !== null && (
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
            {cachedDistance.toFixed(1)} km away
          </Text>
        )}
        {etaMinutes !== null && (
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            ETA ~ {etaMinutes} min
          </Text>
        )}
        {showLiveToggle && (
          <View
            style={{
              marginTop: 6,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>
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
        )}
      </View>
    </View>
  );
}
