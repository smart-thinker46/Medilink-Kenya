import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useAuthStore } from "@/utils/auth/store";

// Auto-logout security behavior:
// - Web: logout on tab/window unload (so returning requires login).
// - Native: logout after the app stays in background briefly.
export const useAutoLogoutOnBackground = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    const logout = () => {
      try {
        useAuthStore.getState().logout();
      } catch {
        // ignore
      }
    };

    if (Platform.OS === "web") {
      const handler = () => logout();
      window.addEventListener("beforeunload", handler);
      window.addEventListener("pagehide", handler);
      return () => {
        window.removeEventListener("beforeunload", handler);
        window.removeEventListener("pagehide", handler);
      };
    }

    const delayMs = Number(process.env.EXPO_PUBLIC_AUTO_LOGOUT_DELAY_MS || 8000);
    const onChange = (state) => {
      if (state === "background") {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => logout(), Number.isFinite(delayMs) ? delayMs : 8000);
        return;
      }
      if (state === "active") {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      sub?.remove?.();
    };
  }, []);
};

