import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";

const categories = [
  "Account",
  "Payments",
  "Appointments",
  "Pharmacy",
  "Video Call",
  "Other",
];

export default function ComplaintScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();

  const [category, setCategory] = useState("Other");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!message.trim()) {
      showToast("Please describe the issue.", "warning");
      return;
    }
    try {
      await apiClient.createComplaint({ category, message });
      showToast("Complaint submitted.", "success");
      router.back();
    } catch (error) {
      showToast(error.message || "Unable to submit complaint.", "error");
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
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
              marginRight: 12,
            }}
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
            Report a Problem
          </Text>
        </View>

        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: category === item ? `${theme.primary}20` : theme.card,
                borderWidth: 1,
                borderColor: category === item ? theme.primary : theme.border,
              }}
              onPress={() => setCategory(item)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: category === item ? theme.primary : theme.textSecondary,
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Details
        </Text>
        <TextInput
          placeholder="Describe your issue"
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          style={{
            height: 160,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingTop: 12,
            color: theme.text,
            marginBottom: 16,
          }}
        />

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
          onPress={handleSubmit}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            Submit Complaint
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
