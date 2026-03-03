import React, { createContext, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "medilink-theme-preference";
const LANGUAGE_KEY = "medilink-language-preference";
const CURRENCY_KEY = "medilink-currency-preference";
const BATTERY_SAVER_KEY = "medilink-battery-saver";
const REFRESH_INTERVAL_KEY = "medilink-refresh-interval";

const useThemeStore = create((set) => ({
  themeMode: "auto", // auto, light, dark
  language: "en",
  currency: "KES",
  batterySaver: false,
  refreshInterval: 15000,
  setThemeMode: async (mode) => {
    await SecureStore.setItemAsync(THEME_KEY, mode);
    set({ themeMode: mode });
  },
  setLanguage: async (language) => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
    set({ language });
  },
  setCurrency: async (currency) => {
    await SecureStore.setItemAsync(CURRENCY_KEY, currency);
    set({ currency });
  },
  setBatterySaver: async (value) => {
    await SecureStore.setItemAsync(BATTERY_SAVER_KEY, value ? "true" : "false");
    set({ batterySaver: Boolean(value) });
  },
  setRefreshInterval: async (value) => {
    await SecureStore.setItemAsync(REFRESH_INTERVAL_KEY, String(value));
    set({ refreshInterval: Number(value) });
  },
}));

const ThemeContext = createContext(null);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return context;
};

export default function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const {
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    currency,
    setCurrency,
    batterySaver,
    setBatterySaver,
    refreshInterval,
    setRefreshInterval,
  } = useThemeStore();

  // Load saved preferences on mount.
  useEffect(() => {
    let mounted = true;
    const loadTheme = async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (mounted && saved && saved !== themeMode) {
          useThemeStore.setState({ themeMode: saved });
        }
        const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
        if (mounted && savedLanguage) {
          useThemeStore.setState({ language: savedLanguage });
        } else if (mounted) {
          const deviceLocale =
            Intl.DateTimeFormat().resolvedOptions().locale || "en";
          const nextLang = deviceLocale.toLowerCase().startsWith("sw") ? "sw" : "en";
          useThemeStore.setState({ language: nextLang });
          await SecureStore.setItemAsync(LANGUAGE_KEY, nextLang);
        }
        const savedCurrency = await SecureStore.getItemAsync(CURRENCY_KEY);
        if (mounted && savedCurrency) {
          useThemeStore.setState({ currency: savedCurrency });
        }
        const savedBattery = await SecureStore.getItemAsync(BATTERY_SAVER_KEY);
        if (mounted && savedBattery) {
          useThemeStore.setState({ batterySaver: savedBattery === "true" });
        }
        const savedInterval = await SecureStore.getItemAsync(REFRESH_INTERVAL_KEY);
        if (mounted && savedInterval) {
          const parsed = Number(savedInterval);
          if (!Number.isNaN(parsed)) {
            useThemeStore.setState({ refreshInterval: parsed });
          }
        }
      } catch {
        // Ignore preference hydration errors to avoid blocking UI thread.
      }
    };
    loadTheme();
    return () => {
      mounted = false;
    };
  }, []);

  const getActiveColorScheme = () => {
    if (themeMode === "auto") {
      return systemColorScheme || "light";
    }
    return themeMode;
  };

  const activeColorScheme = getActiveColorScheme();
  const isDark = activeColorScheme === "dark";

  const colors = {
    light: {
      // Base colors
      background: "#FFFFFF",
      surface: "#F9F7F7",
      surfaceSecondary: "#FDEFF0",
      card: "#FFFFFF",

      // Text colors
      text: "#111111",
      textSecondary: "#2A2A2A",
      textTertiary: "#4A4A4A",

      // Primary/accent
      primary: "#1B8F3A",
      primaryLight: "#E6F4EA",
      primaryDark: "#0F6E2A",
      accent: "#C62828",
      accentLight: "#FDEBEC",
      accentDark: "#8E1D1D",

      // Status colors
      success: "#1B8F3A",
      warning: "#D4A017",
      error: "#C62828",
      info: "#8E1D1D",

      // Border colors
      border: "#D8C8C8",
      borderLight: "#E8DADA",
      borderInput: "#CEBEBE",
      surfaceBorder: "#E1D2D2",

      // Component specific
      inputBackground: "#FFFFFF",
      modalBackground: "#FFFFFF",
      modalOverlay: "rgba(0,0,0,0.5)",
      bottomArea: "#FFFFFF",
      bottomBorder: "#E1D2D2",
      buttonIcon: "rgba(198, 40, 40, 0.14)",
      iconBackground: "#FDEBEC",
      iconColor: "#151515",

      // Empty states
      emptyBackground: "#F9F7F7",
      emptyBorder: "#E1D2D2",

      // Gradients
      gradient: {
        primary: ["#1B8F3A", "#0F6E2A"],
        accent: ["#C62828", "#8E1D1D"],
        background: ["#FFFFFF", "#FDEFF0"],
        success: ["#1B8F3A", "#0F6E2A"],
        warning: ["#D4A017", "#B78600"],
      },
    },
    dark: {
      // Base colors
      background: "#0A0A0A",
      surface: "#1A1A1A",
      surfaceSecondary: "#2A2A2A",
      card: "#1A1A1A",

      // Text colors
      text: "#FFFFFF",
      textSecondary: "#B3B3B3",
      textTertiary: "#7A7A7A",

      // Primary/accent
      primary: "#00B4D8",
      primaryLight: "#90E0EF",
      primaryDark: "#0077B6",
      accent: "#FF8B6B",
      accentLight: "#FFB5A3",
      accentDark: "#E8633B",

      // Status colors
      success: "#10B981",
      warning: "#F59E0B",
      error: "#DC2626",
      info: "#3B82F6",

      // Border colors
      border: "#333333",
      borderLight: "#404040",
      borderInput: "#555555",
      surfaceBorder: "#404040",

      // Component specific
      inputBackground: "#1A1A1A",
      modalBackground: "#1A1A1A",
      modalOverlay: "rgba(0,0,0,0.7)",
      bottomArea: "#1A1A1A",
      bottomBorder: "#333333",
      buttonIcon: "rgba(255, 139, 107, 0.15)",
      iconBackground: "#404040",
      iconColor: "#B3B3B3",

      // Empty states
      emptyBackground: "#1A1A1A",
      emptyBorder: "#404040",

      // Gradients
      gradient: {
        primary: ["#00B4D8", "#0077B6"],
        accent: ["#FF8B6B", "#E8633B"],
        background: ["#0A0A0A", "#1A1A1A"],
        success: ["#10B981", "#059669"],
        warning: ["#F59E0B", "#D97706"],
      },
    },
  };

  const theme = colors[activeColorScheme];

  const value = {
    theme,
    colors,
    colorScheme: activeColorScheme,
    isDark,
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    currency,
    setCurrency,
    batterySaver,
    setBatterySaver,
    refreshInterval,
    setRefreshInterval,
    toggleTheme: () => {
      const newMode = activeColorScheme === "dark" ? "light" : "dark";
      setThemeMode(newMode);
    },
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
