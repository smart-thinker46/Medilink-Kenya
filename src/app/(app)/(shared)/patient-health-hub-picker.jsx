import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Search } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import UserAvatar from "@/components/UserAvatar";

export default function PatientHealthHubPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["patients-directory", search],
    queryFn: () => apiClient.getPatientsDirectory({ search, limit: 50 }),
  });

  const patients = useMemo(() => {
    const raw = patientsQuery.data || [];
    return Array.isArray(raw) ? raw : raw.items || [];
  }, [patientsQuery.data]);

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
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft size={18} color={theme.iconColor} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Health Hub
          </Text>
        </View>

        <View
          style={{
            marginHorizontal: 24,
            marginBottom: 16,
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Search size={16} color={theme.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient by name, email, phone"
            placeholderTextColor={theme.textSecondary}
            style={{
              marginLeft: 10,
              flex: 1,
              color: theme.text,
              fontSize: 13,
              fontFamily: "Inter_400Regular",
            }}
          />
        </View>

        <FlatList
          data={patients}
          keyExtractor={(item, index) => item.id || `patient-${index}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/(shared)/patient-health-hub",
                  params: { patientId: item.id },
                })
              }
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 14,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <UserAvatar
                uri={item.avatarUrl}
                name={item.fullName || item.email || "Patient"}
                size={40}
                backgroundColor={theme.surface}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                  {item.fullName || "Patient"}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {item.email || item.phone || "No contact info"}
                </Text>
              </View>
              <Heart size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {patientsQuery.isLoading ? "Loading patients..." : "No patients found."}
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  );
}
