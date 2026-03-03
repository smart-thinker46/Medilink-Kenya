import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, HeartPulse } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAppTheme } from "@/components/ThemeProvider";
import { usePatientProfile } from "@/utils/usePatientProfile";

export default function MedicalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { profile, updateProfile } = usePatientProfile();

  const [formData, setFormData] = useState({
    allergies: profile?.allergies || "",
    bloodGroup: profile?.bloodGroup || "",
    chronicConditions: profile?.chronicConditions || "",
    insuranceProvider: profile?.insuranceProvider || "",
    insuranceNumber: profile?.insuranceNumber || "",
  });

  const handleSave = () => {
    updateProfile.mutate(formData, {
      onSuccess: () => {
        Alert.alert("Saved", "Medical information updated.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: (error) => {
        Alert.alert("Update Failed", error.message || "Please try again.");
      },
    });
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
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
            Medical Information
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Allergies"
            value={formData.allergies}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, allergies: value }))
            }
            placeholder="e.g. Penicillin, peanuts"
          />
          <Input
            label="Blood Group"
            value={formData.bloodGroup}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, bloodGroup: value }))
            }
            placeholder="e.g. O+"
          />
          <Input
            label="Chronic Conditions"
            value={formData.chronicConditions}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, chronicConditions: value }))
            }
            placeholder="e.g. Diabetes"
          />
          <Input
            label="Insurance Provider"
            value={formData.insuranceProvider}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, insuranceProvider: value }))
            }
          />
          <Input
            label="Insurance Number"
            value={formData.insuranceNumber}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, insuranceNumber: value }))
            }
          />

          <Button title="Save Medical Info" onPress={handleSave} />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
