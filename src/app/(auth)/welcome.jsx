import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ImageBackground,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView as BaseMotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart,
  UserCheck,
  Building2,
  Pill,
  Shield,
  Zap,
  Users,
  Sparkles,
} from "lucide-react-native";

import { useAppTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/utils/i18n";

const { width: screenWidth } = Dimensions.get("window");
const MotiView =
  Platform.OS === "android"
    ? ({ from, animate, transition, exit, children, ...rest }) => (
        <View {...rest}>{children}</View>
      )
    : BaseMotiView;

const heroImage = require("../../../assets/images/Medillinkhome.png");

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { t, language, setLanguage } = useI18n();

  const features = [
    {
      icon: Heart,
      title: t("role_patient"),
      description: t("role_patient_desc"),
      color: "#E11D48",
    },
    {
      icon: UserCheck,
      title: t("role_medic"),
      description: t("role_medic_desc"),
      color: "#2563EB",
    },
    {
      icon: Building2,
      title: t("role_hospital"),
      description: t("role_hospital_desc"),
      color: "#F59E0B",
    },
    {
      icon: Pill,
      title: t("role_pharmacy"),
      description: t("role_pharmacy_desc"),
      color: "#16A34A",
    },
  ];

  const benefits = [
    { icon: Shield, text: "Secure & Private" },
    { icon: Zap, text: "Fast & Reliable" },
    { icon: Users, text: "Trusted Network" },
  ];

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <LinearGradient colors={theme.gradient.background} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 160,
            paddingHorizontal: 20,
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
                    language === option ? `${theme.primary}20` : theme.card,
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
          {/* Hero */}
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 700 }}
            style={{
              borderRadius: 28,
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            <ImageBackground
              source={heroImage}
              style={{
                width: "100%",
                minHeight: 240,
                justifyContent: "flex-end",
              }}
              resizeMode="cover"
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.75)"]}
                style={{ padding: 20 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "Nunito_700Bold",
                        color: "#FFFFFF",
                      }}
                    >
                      M+
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: "Nunito_700Bold",
                      color: "#FFFFFF",
                    }}
                  >
                    Medilink Kenya
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: "Nunito_700Bold",
                    color: "#FFFFFF",
                    lineHeight: 30,
                    marginBottom: 8,
                  }}
                >
                  {t("welcome_title")}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {t("welcome_tagline")}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </MotiView>

          {/* Highlights */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 700, delay: 150 }}
            style={{
              backgroundColor: theme.card,
              borderRadius: 22,
              padding: 18,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Sparkles color={theme.primary} size={18} />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                Built for Kenya’s healthcare
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                lineHeight: 20,
              }}
            >
              From consultations to pharmacy orders and hospital staffing,
              Medilink keeps every step smooth, secure, and professional.
            </Text>
          </MotiView>

          {/* Features */}
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Nunito_600SemiBold",
              color: theme.text,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Care for every role
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {features.map((feature, index) => (
              <MotiView
                key={feature.title}
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: 500,
                  delay: 250 + index * 90,
                }}
                style={{
                  width: (screenWidth - 56) / 2,
                  backgroundColor: theme.card,
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: `${feature.color}18`,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <feature.icon color={feature.color} size={26} />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                    marginBottom: 6,
                  }}
                >
                  {feature.title}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    lineHeight: 16,
                  }}
                >
                  {feature.description}
                </Text>
              </MotiView>
            ))}
          </View>

          {/* Benefits */}
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 700, delay: 600 }}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 18,
              padding: 18,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              Why teams choose Medilink
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              {benefits.map((benefit) => (
                <View key={benefit.text} style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${theme.primary}18`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <benefit.icon color={theme.primary} size={22} />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: theme.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>
          </MotiView>
        </ScrollView>

        {/* Bottom Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 700 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 16,
                paddingVertical: 16,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              activeOpacity={0.85}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                {t("get_started")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                paddingVertical: 16,
              }}
              activeOpacity={0.85}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  textAlign: "center",
                }}
              >
                {t("sign_in")}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              By continuing, you agree to our Terms and Privacy Policy
            </Text>
          </View>
        </MotiView>
      </LinearGradient>
    </View>
  );
}
