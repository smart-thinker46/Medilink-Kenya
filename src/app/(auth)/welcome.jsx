import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ImageBackground,
  Platform,
  Animated,
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
  const isLight = !isDark;
  const ui = {
    backgroundGradient: isLight
      ? ["#F8FAFC", "#EEF5FF", "#F8FAFC"]
      : ["#0A101B", "#0E1626", "#0A101B"],
    card: isLight ? "#FFFFFF" : "#121A2A",
    surface: isLight ? "#F1F5FA" : "#0F1724",
    border: isLight ? "#D7E3F2" : "#1E2A3C",
    primary: isLight ? "#0F4C81" : "#3AA7FF",
    primarySoft: isLight ? "#E1EEF9" : "rgba(58,167,255,0.18)",
    background: isLight ? "#F7FAFC" : "#0B1220",
    heroOverlay: isLight
      ? ["rgba(15,76,129,0.12)", "rgba(15,76,129,0.88)"]
      : ["rgba(8,15,28,0.08)", "rgba(2,6,23,0.9)"],
  };
  const kenyaGlow = ["#0B7A3D", "#0B7A3D", "#FFFFFF", "#C8102E", "#000000", "#FFFFFF", "#0B7A3D"];
  const kenyaGlowDark = [
    "rgba(11,122,61,0.65)",
    "rgba(11,122,61,0.45)",
    "rgba(255,255,255,0.22)",
    "rgba(200,16,46,0.5)",
    "rgba(0,0,0,0.0)",
    "rgba(255,255,255,0.18)",
    "rgba(11,122,61,0.45)",
  ];
  const shellRadius = 22;
  const [actionsHidden, setActionsHidden] = useState(false);
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const scrollTimeoutRef = useRef(null);

  const features = [
    {
      icon: Heart,
      title: t("role_patient"),
      description: t("role_patient_desc"),
      color: isLight ? ui.primary : "#E11D48",
    },
    {
      icon: UserCheck,
      title: t("role_medic"),
      description: t("role_medic_desc"),
      color: isLight ? ui.primary : "#2563EB",
    },
    {
      icon: Building2,
      title: t("role_hospital"),
      description: t("role_hospital_desc"),
      color: isLight ? ui.primary : "#F59E0B",
    },
    {
      icon: Pill,
      title: t("role_pharmacy"),
      description: t("role_pharmacy_desc"),
      color: isLight ? ui.primary : "#16A34A",
    },
  ];

  const benefits = [
    { icon: Shield, text: "Secure & Private" },
    { icon: Zap, text: "Fast & Reliable" },
    { icon: Users, text: "Trusted Network" },
  ];

  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: actionsHidden ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [actionsHidden, actionsAnim]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollActivity = () => {
    setActionsHidden(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setActionsHidden(false);
    }, 200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isLight ? "#0B0F1A" : ui.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <LinearGradient
        colors={isLight ? kenyaGlow : kenyaGlowDark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: isLight ? 3 : 2 }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: shellRadius,
            overflow: "hidden",
            backgroundColor: ui.background,
            shadowColor: isLight ? "#0B7A3D" : "#C8102E",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isLight ? 0.18 : 0.12,
            shadowRadius: isLight ? 18 : 14,
            elevation: isLight ? 8 : 6,
          }}
        >
          <LinearGradient colors={ui.backgroundGradient} style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 160,
                paddingHorizontal: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => setActionsHidden(true)}
              onScrollEndDrag={() => setActionsHidden(false)}
              onMomentumScrollBegin={() => setActionsHidden(true)}
              onMomentumScrollEnd={() => setActionsHidden(false)}
              onScroll={handleScrollActivity}
              scrollEventThrottle={16}
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
                        language === option ? ui.primarySoft : ui.card,
                      borderWidth: 1,
                      borderColor:
                        language === option ? ui.primary : ui.border,
                    }}
                    onPress={() => setLanguage(option)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: language === option ? ui.primary : theme.textSecondary,
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
                  borderWidth: isLight ? 1 : 0,
                  borderColor: isLight ? ui.border : "transparent",
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
                    colors={ui.heroOverlay}
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
                          backgroundColor: "rgba(255,255,255,0.22)",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.35)",
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
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {t("welcome_tagline")}
                    </Text>
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        fontFamily: "Inter_500Medium",
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      Book care, order medicine, and manage staff in one secure hub.
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
                  backgroundColor: ui.card,
                  borderRadius: 22,
                  padding: 18,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: ui.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Sparkles color={ui.primary} size={18} />
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
                      backgroundColor: ui.card,
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: ui.border,
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
                  backgroundColor: ui.surface,
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
                          backgroundColor: `${ui.primary}18`,
                          justifyContent: "center",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <benefit.icon color={ui.primary} size={22} />
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
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>
                    Built for clinics, hospitals, medics, and pharmacies across Kenya.
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
                    Verified profiles, smart search, and instant communication keep care moving.
                  </Text>
                </View>
              </MotiView>

              <View style={{ marginTop: 28, alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>
                  Need help? Contact Medilink Kenya
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
                  support@medilink.co.ke • +254 700 000 000
                </Text>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 20,
                opacity: actionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    translateY: actionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 60],
                    }),
                  },
                ],
              }}
            >
              <View
                style={{
                  backgroundColor: ui.background,
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
                    backgroundColor: ui.primary,
                    borderRadius: 16,
                    paddingVertical: 16,
                    shadowColor: ui.primary,
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
                    borderColor: ui.border,
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
            </Animated.View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}
