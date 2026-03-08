import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, Mail, MessageCircle, CalendarDays, ShoppingBag } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import { getDistanceKm, getExternalMapUrl, normalizeLocation } from "@/utils/locationHelpers";

const normalizeRole = (value) => String(value || "").trim().toUpperCase();

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

const getChatRoute = (viewerRole, userId) => {
  const normalized = normalizeRole(viewerRole);
  if (normalized === "PATIENT") return `/(app)/(patient)/chat?userId=${userId}`;
  if (normalized === "MEDIC") return `/(app)/(medic)/chat?userId=${userId}`;
  if (normalized === "HOSPITAL_ADMIN") return `/(app)/(hospital)/chat?userId=${userId}`;
  if (normalized === "PHARMACY_ADMIN") return `/(app)/(pharmacy)/chat?userId=${userId}`;
  if (normalized === "SUPER_ADMIN") return `/(app)/(admin)/chat?userId=${userId}`;
  return `/(app)/(patient)/chat?userId=${userId}`;
};

export default function EntityProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const params = useLocalSearchParams();
  const userId = String(resolveParam(params?.userId) || "").trim();
  const roleHint = normalizeRole(resolveParam(params?.role));
  const viewerRole = normalizeRole(auth?.user?.role);

  const entityQuery = useQuery({
    queryKey: ["map-discovery", "entity-profile", userId],
    queryFn: () =>
      apiClient.getMapDiscovery({
        include: "medic,pharmacy,hospital",
        userId,
      }),
    enabled: Boolean(userId),
  });

  const myLocationQuery = useQuery({
    queryKey: ["my-location", "entity-profile"],
    queryFn: () => apiClient.getMyLocation(),
  });

  const entity = useMemo(() => {
    const rows = entityQuery.data?.items || [];
    const exactMatch = rows.find((item) => String(item?.userId || "") === userId);
    return exactMatch || rows[0] || null;
  }, [entityQuery.data, userId]);

  const entityRole = normalizeRole(entity?.role || roleHint);
  const entityLocation = normalizeLocation(entity?.location);
  const myLocation = normalizeLocation(myLocationQuery.data?.location);
  const distanceKm =
    myLocation && entityLocation
      ? getDistanceKm(
          {
            latitude: Number(myLocation.latitude),
            longitude: Number(myLocation.longitude),
          },
          {
            latitude: Number(entityLocation.latitude),
            longitude: Number(entityLocation.longitude),
          },
        )
      : null;

  const roleLabel =
    entityRole === "MEDIC"
      ? "Medic"
      : entityRole === "PHARMACY_ADMIN"
        ? "Pharmacy"
        : entityRole === "HOSPITAL_ADMIN"
          ? "Hospital"
          : "User";

  const openExternalMap = async () => {
    if (!entityLocation) {
      showToast("No map coordinates found for this profile.", "warning");
      return;
    }
    const url = getExternalMapUrl(entityLocation, entity?.name || roleLabel);
    if (!url) {
      showToast("Unable to open external map for this location.", "warning");
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showToast("Map app is not available on this device.", "warning");
      return;
    }
    await Linking.openURL(url);
  };

  const openChat = () => {
    if (!userId) {
      showToast("Invalid user profile.", "warning");
      return;
    }
    router.push(getChatRoute(viewerRole, userId));
  };

  const handlePrimaryAction = () => {
    const pharmacyTenantId = String(entity?.tenantId || entity?.userId || "").trim();
    if (entityRole === "MEDIC" && viewerRole === "PATIENT") {
      router.push(`/(app)/(patient)/book-appointment?medicId=${userId}`);
      return;
    }
    if (entityRole === "PHARMACY_ADMIN") {
      if (viewerRole === "PATIENT") {
        router.push({
          pathname: "/(app)/(patient)/pharmacy",
          params: {
            pharmacyId: pharmacyTenantId,
            pharmacyName: entity?.name || "",
          },
        });
        return;
      }
      if (viewerRole === "MEDIC") {
        router.push({
          pathname: "/(app)/(medic)/pharmacy-marketplace",
          params: { pharmacyId: pharmacyTenantId },
        });
        return;
      }
      if (viewerRole === "HOSPITAL_ADMIN") {
        router.push({
          pathname: "/(app)/(hospital)/pharmacy-marketplace",
          params: { pharmacyId: pharmacyTenantId },
        });
        return;
      }
    }
    if (entityRole === "HOSPITAL_ADMIN") {
      if (viewerRole === "PATIENT") {
        router.push(`/(app)/(patient)/search-medics?hospitalId=${userId}`);
        return;
      }
      if (viewerRole === "MEDIC") {
        router.push("/(app)/(medic)/jobs");
        return;
      }
    }
    showToast("No direct action available for this profile.", "info");
  };

  const primaryActionLabel =
    entityRole === "MEDIC" && viewerRole === "PATIENT"
      ? "Book Appointment"
      : entityRole === "PHARMACY_ADMIN" && viewerRole === "PATIENT"
        ? "View Pharmacy Stock"
        : entityRole === "PHARMACY_ADMIN" && viewerRole === "MEDIC"
          ? "Open Pharmacy Marketplace"
          : entityRole === "PHARMACY_ADMIN" && viewerRole === "HOSPITAL_ADMIN"
            ? "Open Pharmacy Marketplace"
            : entityRole === "HOSPITAL_ADMIN" && viewerRole === "PATIENT"
              ? "Find Medics In Hospital"
              : entityRole === "HOSPITAL_ADMIN" && viewerRole === "MEDIC"
                ? "View Hospital Jobs"
                : "";

  const isLoading = entityQuery.isLoading || myLocationQuery.isLoading;

  return (
    <ScreenLayout>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 18,
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
              marginRight: 14,
            }}
            activeOpacity={0.85}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Profile Details
          </Text>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !entity ? (
          <View style={{ paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              Unable to load this profile from discovery data.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 19, fontFamily: "Nunito_700Bold", color: theme.text }}>
                {entity.name || roleLabel}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: theme.textSecondary }}>
                {roleLabel}
              </Text>
              {entity.specialization ? (
                <Text style={{ marginTop: 8, fontSize: 13, color: theme.text }}>
                  Specialization: {entity.specialization}
                </Text>
              ) : null}
              {entityRole === "MEDIC" && Number(entity.experienceYears) > 0 ? (
                <Text style={{ marginTop: 4, fontSize: 13, color: theme.text }}>
                  Experience: {Number(entity.experienceYears)} years
                </Text>
              ) : null}
              {entity?.email ? (
                <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
                  <Mail color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>{entity.email}</Text>
                </View>
              ) : null}
              {entity?.phone ? (
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                  <Phone color={theme.iconColor} size={14} />
                  <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text }}>{entity.phone}</Text>
                </View>
              ) : null}
              <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                <MapPin color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 8, fontSize: 13, color: theme.text, flex: 1 }}>
                  {entityLocation?.address || "No address set"}
                </Text>
              </View>
              {distanceKm !== null && Number.isFinite(distanceKm) ? (
                <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                  Approx distance: {distanceKm.toFixed(1)} km
                </Text>
              ) : null}
            </View>

            <View style={{ marginTop: 14, gap: 10 }}>
              {primaryActionLabel ? (
                <TouchableOpacity
                  onPress={handlePrimaryAction}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: theme.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                  }}
                >
                  <ShoppingBag color="#fff" size={16} />
                  <Text style={{ marginLeft: 8, color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                    {primaryActionLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={openChat}
                style={{
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                <MessageCircle color={theme.text} size={16} />
                <Text style={{ marginLeft: 8, color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  Open Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openExternalMap}
                style={{
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                <MapPin color={theme.text} size={16} />
                <Text style={{ marginLeft: 8, color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  Open In Maps
                </Text>
              </TouchableOpacity>

              {entityRole === "MEDIC" && viewerRole === "PATIENT" ? (
                <TouchableOpacity
                  onPress={() => router.push(`/(app)/(patient)/medic-profile?medicId=${userId}`)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                  }}
                >
                  <CalendarDays color={theme.text} size={16} />
                  <Text style={{ marginLeft: 8, color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                    View Full Medic Profile
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
