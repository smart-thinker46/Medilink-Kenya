import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView as BaseMotiView } from "moti";
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Heart,
  UserCheck,
  Building2,
  Pill,
} from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";

const { width: screenWidth } = Dimensions.get("window");
const MotiView =
  Platform.OS === "android"
    ? ({ from, animate, transition, exit, children, ...rest }) => (
        <View {...rest}>{children}</View>
      )
    : BaseMotiView;

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { t, language, setLanguage } = useI18n();

  const [step, setStep] = useState(1); // 1: Role Selection, 2: Basic Info
  const [selectedRole, setSelectedRole] = useState(null);

  const [formData, setFormData] = useState({
    // Basic info
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    lastName: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});

  const roles = [
    {
      id: "patient",
      title: t("role_patient"),
      description: t("role_patient_desc"),
      icon: Heart,
      color: "#E91E63",
    },
    {
      id: "medic",
      title: t("role_medic"),
      description: t("role_medic_desc"),
      icon: UserCheck,
      color: "#2196F3",
    },
    {
      id: "hospital_admin",
      title: t("role_hospital"),
      description: t("role_hospital_desc"),
      icon: Building2,
      color: "#FF9800",
    },
    {
      id: "pharmacy",
      title: t("role_pharmacy"),
      description: t("role_pharmacy_desc"),
      icon: Pill,
      color: "#4CAF50",
    },
  ];

  const signupMutation = useMutation({
    mutationFn: (data) =>
      apiClient.signup({
        ...data,
        email: data.email.trim().toLowerCase(),
      }),
    onSuccess: (data) => {
      Alert.alert(
        t("account_created"),
        t("account_created_message"),
        [{ text: t("continue"), onPress: () => router.replace("/(auth)/login") }],
      );
    },
    onError: (error) => {
      Alert.alert(t("signup_failed"), error.message || "Please try again");
    },
  });

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!selectedRole) {
        Alert.alert(t("role_required"), t("select_role"));
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.fullName.trim())
        newErrors.fullName = `${t("full_name")} is required`;
      if (!formData.lastName.trim())
        newErrors.lastName = `${t("last_name")} is required`;
      if (!formData.email.trim()) {
        newErrors.email = `${t("email")} is required`;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = `${t("phone_number")} is required`;
      }
      if (!formData.password) {
        newErrors.password = `${t("password")} is required`;
      } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(formData.password)) {
        newErrors.password =
          "Password must be 8+ chars with letters, numbers, and symbols";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 2) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    const roleMap = {
      patient: "PATIENT",
      medic: "MEDIC",
      hospital_admin: "HOSPITAL_ADMIN",
      pharmacy: "PHARMACY_ADMIN",
    };

    const trimmedFullName = formData.fullName.trim();
    const derivedFirstName =
      trimmedFullName.split(" ").filter(Boolean)[0] || trimmedFullName;

    const submitData = {
      email: formData.email,
      password: formData.password,
      firstName: derivedFirstName,
      lastName: formData.lastName,
      fullName: `${trimmedFullName} ${formData.lastName}`.trim(),
      phone: formData.phone,
      role: roleMap[selectedRole],
    };

    signupMutation.mutate(submitData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const renderRoleSelection = () => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 600 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontFamily: "Nunito_700Bold",
          color: theme.text,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {t("choose_role_title")}
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontFamily: "Inter_400Regular",
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: 32,
          lineHeight: 24,
        }}
      >
        {t("choose_role_subtitle")}
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {roles.map((role, index) => (
          <MotiView
            key={role.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "timing",
              duration: 600,
              delay: 200 + index * 100,
            }}
            style={{
              width: (screenWidth - 64) / 2,
              alignSelf: "center",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor:
                  selectedRole === role.id ? `${role.color}20` : theme.card,
                borderRadius: 20,
                padding: 20,
                alignItems: "center",
                borderWidth: selectedRole === role.id ? 2 : 1,
                borderColor:
                  selectedRole === role.id ? role.color : theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => setSelectedRole(role.id)}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: `${role.color}15`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <role.icon color={role.color} size={28} />
              </View>

              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {role.title}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 16,
                }}
              >
                {role.description}
              </Text>
            </TouchableOpacity>
          </MotiView>
        ))}
      </View>
    </MotiView>
  );

  const renderBasicInfo = () => (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: "timing", duration: 600 }}
      style={{ flex: 1 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontFamily: "Nunito_700Bold",
          color: theme.text,
          marginBottom: 8,
        }}
      >
        {t("create_account")}
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontFamily: "Inter_400Regular",
          color: theme.textSecondary,
          marginBottom: 32,
          lineHeight: 24,
        }}
      >
        {t("basic_info_subtitle")}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Input
          label={t("full_name")}
          placeholder={t("full_name")}
          value={formData.fullName}
          onChangeText={(value) => handleInputChange("fullName", value)}
          leftIcon={User}
          containerStyle={{ flex: 1, marginBottom: 16 }}
          error={errors.fullName}
          required
        />

        <Input
          label={t("last_name")}
          placeholder={t("last_name")}
          value={formData.lastName}
          onChangeText={(value) => handleInputChange("lastName", value)}
          containerStyle={{ flex: 1, marginBottom: 16 }}
          error={errors.lastName}
          required
        />
      </View>

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
        label={t("phone_number")}
        placeholder={t("phone_number")}
        value={formData.phone}
        onChangeText={(value) => handleInputChange("phone", value)}
        leftIcon={Phone}
        keyboardType="phone-pad"
        error={errors.phone}
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

      <Input
        label={t("confirm_password")}
        placeholder={t("confirm_password")}
        value={formData.confirmPassword}
        onChangeText={(value) => handleInputChange("confirmPassword", value)}
        leftIcon={Lock}
        secureTextEntry
        error={errors.confirmPassword}
        required
      />
    </MotiView>
  );

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
                justifyContent: "space-between",
                marginBottom: 32,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() =>
                    step > 1
                      ? setStep(step - 1)
                      : router.canGoBack()
                        ? router.back()
                        : router.replace("/(auth)/welcome")
                  }
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
                  Sign Up
                </Text>
              </View>

              {/* Step indicator */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2].map((stepNumber) => (
                  <View
                    key={stepNumber}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        step >= stepNumber ? theme.primary : theme.border,
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              {step === 1 && renderRoleSelection()}
              {step === 2 && renderBasicInfo()}
            </View>

            {/* Bottom Actions */}
            <View style={{ paddingTop: 24 }}>
              <Button
                title={step === 2 ? t("create_account") : t("next")}
                onPress={handleNext}
                loading={signupMutation.isLoading}
                style={{ marginBottom: 16 }}
              />

              {step === 1 && (
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
                    {t("already_have_account")}{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/login")}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.primary,
                      }}
                    >
                      {t("sign_in")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
