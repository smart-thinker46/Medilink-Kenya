import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ThemeProvider";
import ToastProvider from "@/components/ToastProvider";
import { useAppFonts } from "@/utils/useFontLoader";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
  const { initiate, isReady, auth } = useAuth();
  const fontsLoaded = useAppFonts();
  const [pushApi, setPushApi] = useState(null);
  const [bootTimeoutReached, setBootTimeoutReached] = useState(false);

  const appReady = (isReady && fontsLoaded) || bootTimeoutReached;

  useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated and will be removed in a future release.",
    ]);
  }, []);

  useEffect(() => {
    try {
      initiate();
    } catch {
      setBootTimeoutReached(true);
    }
  }, [initiate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBootTimeoutReached(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

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

  useEffect(() => {
    if (!auth?.token) return;
    let cancelled = false;
    const syncBadge = async () => {
      try {
        const notifications = await queryClient.fetchQuery({
          queryKey: ["notifications"],
          queryFn: () => import("../utils/api").then((mod) => mod.default.getNotifications()),
        });
        if (cancelled) return;
        const items = notifications?.items || notifications || [];
        const unread = Array.isArray(items) ? items.filter((n) => !n.isRead).length : 0;
        await pushApi?.syncBadgeCount?.(unread);
      } catch {
        // ignore badge sync failures
      }
    };

    syncBadge();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncBadge();
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, [auth?.token, pushApi]);

  if (!appReady) {
    return null;
  }

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
              <Stack.Screen name="payment-result" />
            </Stack>
          </GestureHandlerRootView>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
