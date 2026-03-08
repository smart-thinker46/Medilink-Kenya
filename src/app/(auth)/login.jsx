import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView as BaseMotiView } from "moti";
import { ArrowLeft, Mail, Lock } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";

const MotiView =
  Platform.OS === "android"
    ? ({ from, animate, transition, exit, children, ...rest }) => (
        <View {...rest}>{children}</View>
      )
    : BaseMotiView;

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { t, language, setLanguage } = useI18n();
  const { setAuth } = useAuthStore();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otpDestination, setOtpDestination] = useState("");

  const [errors, setErrors] = useState({});

  const [googleRequest, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest({
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || undefined,
      androidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    });

  const completeLogin = (data) => {
    setAuth({
      token: data?.accessToken,
      user: data?.user,
      tenantId: data?.tenantId,
      tenant: data?.tenant,
    });
    const role = data?.user?.role?.toUpperCase?.() || data?.user?.role;
    switch (role) {
      case "PATIENT":
        router.replace("/(app)/(patient)");
        break;
      case "MEDIC":
        router.replace("/(app)/(medic)");
        break;
      case "HOSPITAL_ADMIN":
        router.replace("/(app)/(hospital)");
        break;
      case "PHARMACY_ADMIN":
        router.replace("/(app)/(pharmacy)");
        break;
      case "SUPER_ADMIN":
        router.replace("/(app)/(admin)");
        break;
      default:
        router.replace("/");
    }
  };

  const loginMutation = useMutation({
    mutationFn: ({ email, password, otp, challengeId }) =>
      apiClient.login(email.trim().toLowerCase(), password, otp, challengeId),
    onSuccess: (data) => {
      if (data?.requiresOtp) {
        setOtpChallengeId(String(data?.challengeId || ""));
        setOtpDestination(String(data?.destination || ""));
        Alert.alert(
          "OTP sent",
          `We've sent a verification code to ${data?.destination || "your email"}.`,
        );
        return;
      }
      completeLogin(data);
    },
    onError: (error) => {
      const message = String(error?.message || "Please try again");
      if (message.toLowerCase().includes("password expired")) {
        Alert.alert(
          "Password expired",
          "Your password has expired. Reset it now to continue using the app.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Reset Password", onPress: () => router.push("/(auth)/forgot-password") },
          ],
        );
        return;
      }
      Alert.alert(t("login_failed"), message);
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken) => apiClient.googleContinue(idToken),
    onSuccess: (data) => {
      completeLogin(data);
    },
    onError: (error) => {
      Alert.alert(
        t("login_failed"),
        String(error?.message || "Google sign in failed. Please try again."),
      );
    },
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const idToken =
        googleResponse?.params?.id_token ||
        googleResponse?.authentication?.idToken;
      if (!idToken) {
        Alert.alert(
          t("login_failed"),
          "Google login was successful, but no ID token was returned.",
        );
        return;
      }
      googleMutation.mutate(idToken);
      return;
    }
    if (googleResponse.type === "error") {
      Alert.alert(
        t("login_failed"),
        "Google sign in was cancelled or failed. Please try again.",
      );
    }
  }, [googleResponse]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (otpChallengeId && !String(formData.otp || "").trim()) {
      newErrors.otp = "OTP code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (validateForm()) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
        otp: otpChallengeId ? String(formData.otp || "").trim() : undefined,
        challengeId: otpChallengeId || undefined,
      });
    }
  };

  const handleResendOtp = () => {
    if (!formData.email.trim() || !formData.password) {
      Alert.alert("Missing details", "Enter email and password first.");
      return;
    }
    setFormData((prev) => ({ ...prev, otp: "" }));
    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  const handleGoogleContinue = async () => {
    if (!googleRequest) {
      Alert.alert(
        t("login_failed"),
        "Google Sign-In is not configured. Add Google client IDs in .env.",
      );
      return;
    }
    await promptGoogleSignIn();
  };

  const handleInputChange = (field, value) => {
    if ((field === "email" || field === "password") && otpChallengeId) {
      setOtpChallengeId("");
      setOtpDestination("");
      setFormData((prev) => ({ ...prev, otp: "" }));
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <LinearGradient colors={theme.gradient.background} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 40,
              paddingHorizontal: 24,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 }}>
              {["en", "sw"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    marginLeft: 8,
                    backgroundColor:
                      language === option ? `${theme.primary}20` : theme.surface,
                    borderWidth: 1,
                    borderColor:
                      language === option ? theme.primary : theme.border,
                  }}
                  onPress={() => setLanguage(option)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: language === option ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 40,
              }}
            >
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/welcome"))}
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
                  fontSize: 20,
                  fontFamily: "Nunito_600SemiBold",
                  color: theme.text,
                }}
              >
                {t("sign_in")}
              </Text>
            </View>

            {/* Welcome */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 600 }}
              style={{ marginBottom: 40 }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: "Nunito_700Bold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {t("welcome_back")}
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  lineHeight: 24,
                }}
              >
                {otpChallengeId
                  ? `Enter the OTP sent to ${otpDestination || "your email"} to complete login.`
                  : t("welcome_subtitle")}
              </Text>
            </MotiView>

            {/* Form */}
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 600, delay: 200 }}
              style={{ flex: 1 }}
            >
              <Input
                label={t("email")}
                placeholder={t("enter_email")}
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                leftIcon={Mail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
                required
              />

              <Input
                label={t("password")}
                placeholder={t("enter_password")}
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
                leftIcon={Lock}
                secureTextEntry
                error={errors.password}
                required
              />

              {otpChallengeId ? (
                <Input
                  label="One-Time Password (OTP)"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChangeText={(value) =>
                    handleInputChange("otp", value.replace(/[^\d]/g, "").slice(0, 8))
                  }
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.otp}
                  required
                />
              ) : null}

              {otpChallengeId ? (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  style={{
                    alignSelf: "flex-end",
                    marginBottom: 32,
                    marginTop: -8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_500Medium",
                      color: theme.primary,
                    }}
                  >
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/forgot-password")}
                  style={{
                    alignSelf: "flex-end",
                    marginBottom: 32,
                    marginTop: -8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_500Medium",
                      color: theme.primary,
                    }}
                  >
                    {t("forgot_password")}
                  </Text>
                </TouchableOpacity>
              )}

              <Button
                title={otpChallengeId ? "Verify OTP" : t("sign_in")}
                onPress={handleLogin}
                loading={loginMutation.isLoading}
                style={{ marginBottom: 24 }}
              />

              {!otpChallengeId ? (
                <>
                  <TouchableOpacity
                    onPress={handleGoogleContinue}
                    disabled={googleMutation.isPending}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      marginBottom: 18,
                      opacity: googleMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.text,
                      }}
                    >
                      {googleMutation.isPending
                        ? "Connecting Google..."
                        : "Continue with Google"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {/* Sign Up Link */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                  }}
                >
                  {t("no_account")}{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.primary,
                    }}
                  >
                    {t("sign_up")}
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
