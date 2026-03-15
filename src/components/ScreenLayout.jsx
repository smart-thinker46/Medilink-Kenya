import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "./ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { usePathname } from "expo-router";
import { useSecureScreen } from "@/utils/security/useSecureScreen";

export default function ScreenLayout({ children, style, showWebBack = false, secure }) {
  const { theme, colorScheme } = useAppTheme();
  const { auth, setAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isBlocked =
    auth?.user?.status === "suspended" || Boolean(auth?.user?.blocked);
  const requiresVerification = Boolean(auth?.user?.identityVerificationRequired);
  const role = String(auth?.user?.role || "").toUpperCase();
  const isWeb = Platform.OS === "web";
  const canGoBack =
    isWeb && typeof window !== "undefined" ? window.history.length > 1 : false;

  const autoSecure =
    typeof secure === "boolean"
      ? secure
      : /health|medical|record|payment|audit|prescription|orders|appointments|profile/i.test(
          pathname || "",
        );
  useSecureScreen(autoSecure);

  const verificationRoute =
    role === "MEDIC"
      ? "/(app)/(medic)/edit-profile"
      : role === "HOSPITAL_ADMIN"
        ? "/(app)/(hospital)/edit-profile"
        : role === "PHARMACY_ADMIN"
          ? "/(app)/(pharmacy)/edit-profile"
          : "/(app)/(patient)/edit-profile";

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.background,
        },
        style,
      ]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
          alignSelf: "center",
          position: "relative",
        }}
      >
        {isWeb && showWebBack && canGoBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: theme.card,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <ArrowLeft color={theme.text} size={16} />
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        )}
        {requiresVerification && (
          <View
            style={{
              marginTop: isWeb ? 48 : 12,
              marginHorizontal: 12,
              marginBottom: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.warning,
              backgroundColor: `${theme.warning}1A`,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 6,
              }}
            >
              Identity verification required
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
              We detected unusual activity. Please complete identity verification to keep your
              account active.
            </Text>
            <TouchableOpacity
              onPress={() => router.push(verificationRoute)}
              style={{
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: theme.primary,
              }}
            >
              <Text style={{ fontSize: 12, color: "#fff", fontFamily: "Inter_600SemiBold" }}>
                Verify now
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {children}
      </View>
      {isBlocked && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.modalOverlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Account Blocked
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Your account is temporarily blocked. Please contact support to
              regain access.
            </Text>
            <TouchableOpacity
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: theme.primary,
              }}
              onPress={() => setAuth(null)}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
