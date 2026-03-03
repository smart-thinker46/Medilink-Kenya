import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

export default function ComplaintsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  const complaintsQuery = useQuery({
    queryKey: ["my-complaints"],
    queryFn: () => apiClient.getMyComplaints(),
  });

  const complaints = complaintsQuery.data || [];

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
          My Complaints
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
              No complaints submitted yet.
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
                {complaint.category || "General"} • {complaint.status || "OPEN"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                {complaint.message}
              </Text>
              {complaint.resolution ? (
                <Text style={{ fontSize: 11, color: theme.success, marginTop: 6 }}>
                  Resolution: {complaint.resolution}
                </Text>
              ) : null}
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                {complaint.createdAt || ""}
              </Text>
            </MotiView>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
