import { useEffect } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

export const useSecureScreen = (enabled = true) => {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      return;
    }
    let isMounted = true;
    ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
    return () => {
      if (!isMounted) return;
      ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
      isMounted = false;
    };
  }, [enabled]);
};
