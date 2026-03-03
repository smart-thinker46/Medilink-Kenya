import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { View, Text, Animated } from "react-native";
import { useAppTheme } from "@/components/ThemeProvider";

const ToastContext = createContext({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const toastColors = (theme, type) => {
  switch (type) {
    case "success":
      return { bg: `${theme.success}15`, border: theme.success, text: theme.success };
    case "error":
      return { bg: `${theme.error}15`, border: theme.error, text: theme.error };
    case "warning":
      return { bg: `${theme.warning}15`, border: theme.warning, text: theme.warning };
    default:
      return { bg: theme.card, border: theme.border, text: theme.text };
  }
};

export default function ToastProvider({ children }) {
  const { theme } = useAppTheme();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = "info", duration = 2600) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast({ message, type });
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, duration);
  }, [opacity]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const colors = toast ? toastColors(theme, toast.type) : null;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          style={{
            position: "absolute",
            top: 56,
            left: 16,
            right: 16,
            opacity,
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: colors.text,
              }}
            >
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
