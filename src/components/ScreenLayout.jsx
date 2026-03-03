import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "./ThemeProvider";
import { useAuthStore } from "@/utils/auth/store";

export default function ScreenLayout({ children, style }) {
  const { theme, colorScheme } = useAppTheme();
  const { auth, setAuth } = useAuthStore();
  const isBlocked =
    auth?.user?.status === "suspended" || Boolean(auth?.user?.blocked);

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
        }}
      >
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
