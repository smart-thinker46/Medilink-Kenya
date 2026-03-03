import { Stack } from "expo-router";
import { useAuthStore } from "@/utils/auth/store";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

export default function AppLayout() {
  const { auth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const hasToken = Boolean(auth?.token || auth?.jwt || auth?.accessToken);
  const role = String(auth?.user?.role || "").toUpperCase();

  const roleHomePath = {
    PATIENT: "/(app)/(patient)",
    MEDIC: "/(app)/(medic)",
    HOSPITAL_ADMIN: "/(app)/(hospital)",
    PHARMACY_ADMIN: "/(app)/(pharmacy)",
    SUPER_ADMIN: "/(app)/(admin)",
  };

  useEffect(() => {
    // Redirect unauthenticated users
    if (!hasToken) {
      router.replace("/(auth)/welcome");
      return;
    }

    const expectedPrefix = roleHomePath[role] || "/(auth)/welcome";
    const roleToGroup = {
      PATIENT: "(patient)",
      MEDIC: "(medic)",
      HOSPITAL_ADMIN: "(hospital)",
      PHARMACY_ADMIN: "(pharmacy)",
      SUPER_ADMIN: "(admin)",
    };
    const expectedGroup = roleToGroup[role];
    const appGroup = segments?.[0];
    const activeRoleGroup = segments?.[1];

    if (appGroup === "(app)") {
      const knownRoleGroups = new Set([
        "(patient)",
        "(medic)",
        "(hospital)",
        "(pharmacy)",
        "(admin)",
      ]);

      const superAdminAllowedGroups = new Set([
        "(admin)",
        "(medic)",
        "(pharmacy)",
      ]);
      if (
        role === "SUPER_ADMIN" &&
        knownRoleGroups.has(String(activeRoleGroup || "")) &&
        superAdminAllowedGroups.has(String(activeRoleGroup || ""))
      ) {
        return;
      }

      if (
        expectedGroup &&
        knownRoleGroups.has(String(activeRoleGroup || "")) &&
        activeRoleGroup !== expectedGroup
      ) {
        router.replace(expectedPrefix);
      }
    }
  }, [hasToken, segments, role, router]);

  if (!hasToken) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="(medic)" />
      <Stack.Screen name="(hospital)" />
      <Stack.Screen name="(pharmacy)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
