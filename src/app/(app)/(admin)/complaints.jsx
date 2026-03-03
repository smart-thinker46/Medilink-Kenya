import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

export default function AdminComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const complaintsQuery = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: () => apiClient.adminGetComplaints(),
  });
  const complaints = complaintsQuery.data || [];

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }) =>
      apiClient.adminResolveComplaint(id, { status: "RESOLVED", resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
  });

  const [resolutionMap, setResolutionMap] = useState({});

  const handleResolve = async (id) => {
    try {
      await resolveMutation.mutateAsync({
        id,
        resolution: resolutionMap[id] || "",
      });
      showToast("Complaint resolved.", "success");
      setResolutionMap((prev) => ({ ...prev, [id]: "" }));
    } catch (error) {
      showToast(error.message || "Failed to resolve complaint.", "error");
    }
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Nunito_700Bold",
            color: theme.text,
            marginBottom: 16,
          }}
        >
          Complaints
        </Text>

        {complaints.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              No complaints reported yet.
            </Text>
          </View>
        ) : (
          complaints.map((complaint, index) => (
            <MotiView
              key={complaint.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: index * 60 }}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.text }}>
                {complaint.category || "General"} • {complaint.role || "User"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                {complaint.message}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                Status: {complaint.status || "OPEN"}
              </Text>

              {complaint.status !== "RESOLVED" && (
                <>
                  <TextInput
                    placeholder="Resolution notes"
                    placeholderTextColor={theme.textSecondary}
                    value={resolutionMap[complaint.id] || ""}
                    onChangeText={(value) =>
                      setResolutionMap((prev) => ({ ...prev, [complaint.id]: value }))
                    }
                    style={{
                      height: 48,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      paddingHorizontal: 12,
                      color: theme.text,
                      marginTop: 10,
                    }}
                  />
                  <TouchableOpacity
                    style={{
                      marginTop: 10,
                      backgroundColor: theme.primary,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                    onPress={() => handleResolve(complaint.id)}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      Resolve
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </MotiView>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
