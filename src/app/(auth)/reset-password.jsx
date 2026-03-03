import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Lock } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();

  const initialToken = useMemo(
    () => String(params?.token || "").trim(),
    [params?.token],
  );

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const resetMutation = useMutation({
    mutationFn: ({ resetToken, newPassword }) => apiClient.resetPassword(resetToken, newPassword),
    onSuccess: () => {
      Alert.alert("Password updated", "Your password has been reset successfully.", [
        { text: "Sign In", onPress: () => router.replace("/(auth)/login") },
      ]);
    },
    onError: (err) => {
      Alert.alert("Reset failed", err.message || "Please try again.");
    },
  });

  const onSubmit = () => {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      setError("Reset token is required");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    resetMutation.mutate({ resetToken: normalizedToken, newPassword: password });
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
              Reset Password
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 20 }}>
            Enter the reset token sent to your email and choose a new password.
          </Text>

          <Input
            label="Reset Token"
            placeholder="Paste reset token"
            value={token}
            onChangeText={(value) => {
              setToken(value);
              if (error) setError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            required
          />

          <Input
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            required
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            required
          />

          <Button
            title="Reset Password"
            onPress={onSubmit}
            loading={resetMutation.isLoading}
            style={{ marginTop: 10 }}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

