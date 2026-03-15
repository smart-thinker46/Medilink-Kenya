import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Mail } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";
import CaptchaChallenge from "@/components/CaptchaChallenge";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);

  const forgotMutation = useMutation({
    mutationFn: ({ email, token }) => apiClient.forgotPassword(email, token),
    onSuccess: () => {
      Alert.alert(
        "Check your email",
        "If this email exists, an OTP/reset token has been sent.",
        [
          { text: "Back to Login", onPress: () => router.replace("/(auth)/login") },
          { text: "Reset Now", onPress: () => router.push("/(auth)/reset-password") },
        ],
      );
    },
    onError: (err) => {
      setCaptchaToken("");
      setCaptchaKey((prev) => prev + 1);
      Alert.alert("Reset request failed", err.message || "Please try again.");
    },
  });

  const onSubmit = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      setError("Enter a valid email");
      return;
    }
    if (!captchaToken) {
      Alert.alert("Verification required", "Complete the security check to continue.");
      return;
    }
    setError("");
    forgotMutation.mutate({ email: normalized, token: captchaToken });
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/login")}
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
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Forgot Password
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 20 }}>
            Enter your account email. We will send password reset instructions.
          </Text>

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError("");
            }}
            leftIcon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            required
          />

          <CaptchaChallenge
            key={`forgot-captcha-${captchaKey}`}
            onVerified={(token) => setCaptchaToken(token)}
            helperText="Complete the security check to request a reset."
          />

          <Button
            title="Send Reset OTP"
            onPress={onSubmit}
            loading={forgotMutation.isLoading}
            disabled={!captchaToken}
            style={{ marginTop: 10 }}
          />

          <TouchableOpacity onPress={() => router.push("/(auth)/reset-password")} style={{ marginTop: 14 }}>
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium" }}>
              I already have a reset token
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
