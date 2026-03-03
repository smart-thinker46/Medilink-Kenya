import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export const authKey = `medilink-kenya-jwt`;

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
      await SecureStore.setItemAsync(authKey, JSON.stringify(normalized));
    } else {
      await SecureStore.deleteItemAsync(authKey);
    }
    set({ auth: normalized, isReady: true });
  },
  loadAuth: async () => {
    try {
      const authData = await SecureStore.getItemAsync(authKey);
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
    await SecureStore.deleteItemAsync(authKey);
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
