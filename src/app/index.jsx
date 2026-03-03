import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Platform, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView as BaseMotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";

const MotiView =
  Platform.OS === "android"
    ? ({ from, animate, transition, exit, children, ...rest }) => (
        <View {...rest}>{children}</View>
      )
    : BaseMotiView;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { auth } = useAuthStore();
  const hasToken = Boolean(auth?.token || auth?.jwt || auth?.accessToken);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isLight = !isDark;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after animation
    const timer = setTimeout(() => {
      if (hasToken) {
        const role = auth.user?.role?.toUpperCase?.() || auth.user?.role;
        // Navigate to appropriate role-based home
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
            router.replace("/(auth)/welcome");
        }
      } else {
        router.replace("/(auth)/welcome");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [auth, hasToken, router, scaleAnim, fadeAnim]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {isLight ? (
          <View style={{ ...StyleSheet.absoluteFillObject }}>
            <View style={{ flex: 1, backgroundColor: "#111111" }} />
            <View style={{ height: 6, backgroundColor: "#FFFFFF" }} />
            <View style={{ flex: 1, backgroundColor: "#C62828" }} />
            <View style={{ height: 6, backgroundColor: "#FFFFFF" }} />
            <View style={{ flex: 1, backgroundColor: "#1B8F3A" }} />
          </View>
        ) : (
          <LinearGradient
            colors={theme.gradient.primary}
            style={{ ...StyleSheet.absoluteFillObject }}
          />
        )}

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          {/* Logo Container */}
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            {/* Logo Placeholder - You can replace with actual logo */}
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: isLight ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
                borderWidth: 2,
                borderColor: isLight ? "rgba(17,17,17,0.2)" : "rgba(255,255,255,0.3)",
              }}
            >
              {isLight ? (
                <View
                  style={{
                    position: "absolute",
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flex: 1, backgroundColor: "#111111" }} />
                  <View style={{ height: 4, backgroundColor: "#FFFFFF" }} />
                  <View style={{ flex: 1, backgroundColor: "#C62828" }} />
                  <View style={{ height: 4, backgroundColor: "#FFFFFF" }} />
                  <View style={{ flex: 1, backgroundColor: "#1B8F3A" }} />
                </View>
              ) : null}
              <Text
                style={{
                  fontSize: 36,
                  fontFamily: "Nunito_700Bold",
                  color: isLight ? "#FFFFFF" : "#FFFFFF",
                  textShadowColor: "rgba(0,0,0,0.3)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                M+
              </Text>
            </View>

            {/* App Title */}
            <Text
              style={{
                fontSize: 32,
                fontFamily: "Nunito_700Bold",
                color: "#FFFFFF",
                textAlign: "center",
                marginBottom: 8,
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
            >
              Medilink Kenya
            </Text>

            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.92)",
                textAlign: "center",
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              Connecting Healthcare Across Kenya
            </Text>
          </Animated.View>

          {/* Loading Indicator */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginTop: 40,
            }}
          >
            <MotiView
              from={{
                scale: 0.8,
                opacity: 0.5,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: "timing",
                duration: 1000,
                loop: true,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.92)",
                }}
              />
            </MotiView>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            paddingBottom: insets.bottom + 32,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
              textShadowColor: "rgba(0,0,0,0.35)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            Empowering Healthcare Access for All
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
