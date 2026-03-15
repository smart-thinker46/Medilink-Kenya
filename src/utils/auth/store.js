import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const authKey = `medilink-kenya-jwt`;

// Session-only auth:
// - Web: sessionStorage (clears when tab/window closes).
// - Native: in-memory only (clears when app process restarts).
const AUTH_SESSION_MODE =
  String(process.env.EXPO_PUBLIC_AUTH_SESSION_MODE || "session").toLowerCase() === "persist"
    ? "persist"
    : "session";

const canUseSessionStorage = () => {
  if (Platform.OS !== "web") return false;
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
};

const writeAuth = async (value) => {
  if (AUTH_SESSION_MODE === "session") {
    if (canUseSessionStorage()) {
      window.sessionStorage.setItem(authKey, value);
    }
    return;
  }
  await SecureStore.setItemAsync(authKey, value);
};

const readAuth = async () => {
  if (AUTH_SESSION_MODE === "session") {
    if (canUseSessionStorage()) {
      return window.sessionStorage.getItem(authKey);
    }
    // Native session mode does not persist auth.
    return null;
  }
  return SecureStore.getItemAsync(authKey);
};

const clearAuth = async () => {
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.removeItem(authKey);
    } catch {
      // ignore
    }
  }
  try {
    await SecureStore.deleteItemAsync(authKey);
  } catch {
    // ignore (SecureStore may be unavailable on some web setups)
  }
};

export const normalizeAuth = (auth) => {
  if (!auth || typeof auth !== "object") return null;
  const token = auth.token || auth.jwt || auth.accessToken || null;
  const user = auth.user || null;
  if (!token && !user) return null;
  return {
    ...auth,
    token: token || null,
    jwt: undefined,
    accessToken: undefined,
  };
};

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set, get) => ({
  isReady: false,
  auth: null,
  setAuth: async (auth) => {
    const normalized = normalizeAuth(auth);
    if (normalized) {
      await writeAuth(JSON.stringify(normalized));
    } else {
      await clearAuth();
    }
    set({ auth: normalized, isReady: true });
  },
  loadAuth: async () => {
    try {
      const authData = await readAuth();
      if (authData) {
        const parsedAuth = normalizeAuth(JSON.parse(authData));
        set({ auth: parsedAuth, isReady: true });
      } else {
        set({ auth: null, isReady: true });
      }
    } catch (error) {
      console.error("Failed to load auth data:", error);
      set({ auth: null, isReady: true });
    }
  },
  logout: async () => {
    await clearAuth();
    set({ auth: null });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "login",
  initialRole: null,
  open: (options) =>
    set({
      isOpen: true,
      mode: options?.mode || "login",
      initialRole: options?.initialRole || null,
    }),
  close: () => set({ isOpen: false, initialRole: null }),
  setMode: (mode) => set({ mode }),
}));
