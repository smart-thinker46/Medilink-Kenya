import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ThemeProvider";
import ToastProvider from "@/components/ToastProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, auth } = useAuth();
  const [pushApi, setPushApi] = useState(null);

  useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated and will be removed in a future release.",
    ]);
  }, []);

  useEffect(() => {
    try {
      initiate();
    } catch {
      // Allow UI to continue even when auth hydration fails.
    }
  }, [initiate]);

  useEffect(() => {
    let unsubscribe;
    let mounted = true;
    (async () => {
      try {
        const mod = await import("../utils/pushNotifications");
        if (!mounted) return;
        setPushApi(mod);
        unsubscribe = mod?.setupPushHandlers?.();
      } catch {
        unsubscribe = undefined;
      }
    })();
    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (auth?.token) {
      pushApi?.registerDeviceToken?.().catch(() => undefined);
    }
  }, [auth?.token, pushApi]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
              screenOptions={{ headerShown: false }}
              initialRouteName="index"
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </GestureHandlerRootView>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
