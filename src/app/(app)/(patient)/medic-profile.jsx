import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  FileBadge2,
  MapPin,
  CalendarDays,
  Coins,
  BriefcaseMedical,
  MessageCircle,
  Lock,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

const resolvePathParam = (value) => (Array.isArray(value) ? value[0] : value);

const resolveAbsoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = String(process.env.EXPO_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
};

export default function MedicProfileViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams();
  const medicId = resolvePathParam(params?.medicId);

  const medicQuery = useQuery({
    queryKey: ["patient-medic-profile", medicId],
    queryFn: () => apiClient.getMedicById(medicId),
    enabled: Boolean(medicId),
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "patient-chat-access", medicId],
    queryFn: () => apiClient.getAppointments(),
  });

  const medic = medicQuery.data;
  const workingDays = useMemo(() => {
    if (Array.isArray(medic?.workingDays)) return medic.workingDays.filter(Boolean);
    if (Array.isArray(medic?.availabilityDays)) return medic.availabilityDays.filter(Boolean);
    return [];
  }, [medic]);

  const displayLocation =
    medic?.location?.address ||
    (typeof medic?.location === "string" ? medic.location : "") ||
    "Not provided";
  const consultationPrice = Number(
    medic?.consultationPrice ?? medic?.consultationFee ?? 0,
  );
  const licenseUrl = resolveAbsoluteUrl(medic?.licenseUrl);
  const bookedMedicIds = useMemo(() => {
    const items = appointmentsQuery.data?.items || appointmentsQuery.data || [];
    const ids = new Set();
    items.forEach((appt) => {
      const status = String(appt?.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled") return;
      const id = appt?.medicId || appt?.medic_id;
      if (id) ids.add(String(id));
    });
    return ids;
  }, [appointmentsQuery.data]);
  const canChat = medicId && bookedMedicIds.has(String(medicId));

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 16,
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
              marginRight: 14,
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
            }}
          >
            Medic Profile
          </Text>
        </View>

        {medicQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !medic ? (
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.textSecondary,
              }}
            >
              Unable to load medic profile.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Inter_700Bold",
                  color: theme.text,
                }}
              >
                {medic.name || "Medic"}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                }}
              >
                {medic.specialization || "Specialization not provided"}
              </Text>

              <View style={{ marginTop: 16, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <BriefcaseMedical color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: theme.text,
                      fontFamily: "Inter_500Medium",
                    }}
                  >
                    Experience: {medic.experienceYears ?? "N/A"} years
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Coins color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: theme.text,
                      fontFamily: "Inter_500Medium",
                    }}
                  >
                    Consultation Price: {consultationPrice > 0 ? `KES ${consultationPrice}` : "N/A"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MapPin color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: theme.text,
                      fontFamily: "Inter_500Medium",
                      flex: 1,
                    }}
                  >
                    Location: {displayLocation}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FileBadge2 color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: theme.text,
                      fontFamily: "Inter_500Medium",
                      flex: 1,
                    }}
                  >
                    License No: {medic.licenseNumber || "Not provided"}
                  </Text>
                </View>
              </View>

              {licenseUrl ? (
                <TouchableOpacity
                  style={{
                    marginTop: 14,
                    backgroundColor: `${theme.primary}15`,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  onPress={() => Linking.openURL(licenseUrl)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.primary,
                    }}
                  >
                    View License
                  </Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <CalendarDays color={theme.primary} size={16} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.text,
                    }}
                  >
                    Working Days
                  </Text>
                </View>
                {workingDays.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {workingDays.map((day) => (
                      <View
                        key={String(day)}
                        style={{
                          backgroundColor: theme.surface,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: theme.textSecondary,
                          }}
                        >
                          {String(day)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: theme.textSecondary,
                    }}
                  >
                    No working days provided.
                  </Text>
                )}
              </View>
            </View>

            <View
              style={{
                marginTop: 14,
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <BadgeCheck color={theme.success} size={16} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                  flex: 1,
                }}
              >
                This profile is shared for patient view to support medic discovery.
              </Text>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 14,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                borderWidth: canChat ? 0 : 1,
                borderColor: canChat ? "transparent" : theme.border,
                opacity: canChat ? 1 : 0.6,
              }}
              onPress={() => {
                if (!canChat) {
                  Alert.alert(
                    "Chat Locked",
                    "Book an appointment with this medic to unlock chat.",
                  );
                  return;
                }
                router.push(`/(app)/(patient)/chat?medicId=${medicId}`);
              }}
            >
              {canChat ? (
                <MessageCircle color={theme.textSecondary} size={16} />
              ) : (
                <Lock color={theme.textSecondary} size={16} />
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginLeft: 8,
                }}
              >
                {canChat ? "Chat" : "Chat Locked"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
