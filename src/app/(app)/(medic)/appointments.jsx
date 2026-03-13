import React from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ArrowLeft, Calendar, Video, MessageCircle } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";

export default function MedicAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { makeMedicalCall } = useVideoCall();
  const {
    isSuperAdmin,
    medicUserId,
    medics,
    setSelectedMedicUserId,
    isLoadingScope,
  } = useMedicScope();

  const sessionsQuery = useQuery({
    queryKey: ["medic-appointments"],
    queryFn: () => apiClient.getAppointments({ status: "confirmed" }),
  });

  const sessionsRaw = sessionsQuery.data?.items || sessionsQuery.data || [];
  const sessions = sessionsRaw.filter(
    (item) => String(item?.medicId || "") === String(medicUserId || ""),
  );

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
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
              marginRight: 16,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Sessions
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <MedicScopeSelector
            visible={isSuperAdmin}
            medics={medics}
            selectedMedicId={medicUserId}
            onSelect={setSelectedMedicUserId}
            loading={isLoadingScope}
          />
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item, index) => item.id || `session-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 80 }}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    marginBottom: 6,
                  }}
                >
                  {item.patientName || "Patient"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar color={theme.textSecondary} size={14} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    {item.date || "--"} {item.time || ""}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => router.push("/(app)/(shared)/conversations")}
                  >
                    <MessageCircle color={theme.textSecondary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_500Medium",
                        color: theme.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Chat
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: `${theme.primary}15`,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() =>
                      Alert.alert("Start Call", "Choose call type", [
                        {
                          text: "Audio",
                          onPress: () =>
                            makeMedicalCall(item.medicId || item.id, item.id, {
                              mode: "audio",
                            }),
                        },
                        {
                          text: "Video",
                          onPress: () =>
                            makeMedicalCall(item.medicId || item.id, item.id, {
                              mode: "video",
                            }),
                        },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                  >
                    <Video color={theme.primary} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.primary,
                        marginLeft: 6,
                      }}
                    >
                      Start Call
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={() => (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                }}
              >
                No sessions booked yet.
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
