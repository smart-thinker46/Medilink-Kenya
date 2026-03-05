import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ThemeProvider";
import { useAppFonts } from "@/utils/useFontLoader";
import ToastProvider from "@/components/ToastProvider";
import { registerDeviceToken, setupPushHandlers } from "@/utils/pushNotifications";

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
  const [forceReady, setForceReady] = useState(false);
  const hideNativeSplash = () => SplashScreen.hideAsync().catch(() => undefined);

  useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated and will be removed in a future release.",
    ]);
  }, []);

  useEffect(() => {
    try {
      initiate();
    } catch {
      setForceReady(true);
      hideNativeSplash();
    }
  }, [initiate]);

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = setupPushHandlers();
    } catch {
      unsubscribe = undefined;
    }
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (auth?.token) {
      registerDeviceToken().catch(() => undefined);
    }
  }, [auth?.token]);

  useEffect(() => {
    if (isReady && fontsLoaded) {
      hideNativeSplash();
    }
  }, [isReady, fontsLoaded]);

  useEffect(() => {
    // Emergency fallback: never keep native splash forever.
    const timer = setTimeout(() => {
      setForceReady(true);
      hideNativeSplash();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady || !fontsLoaded) {
        setForceReady(true);
        hideNativeSplash();
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isReady, fontsLoaded]);

  if ((!isReady || !fontsLoaded) && !forceReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="small" color="#1B8F3A" />
      </View>
    );
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
            </Stack>
          </GestureHandlerRootView>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
