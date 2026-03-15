import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

let Application = null;
let Device = null;

try {
  Application = require("expo-application");
} catch {
  Application = null;
}

try {
  Device = require("expo-device");
} catch {
  Device = null;
}

export const useAppIntegrity = (options = {}) => {
  const { onRisk } = options;
  const [report, setReport] = useState(null);

  const expectedAndroidPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "";
  const expectedIosBundle = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || "";

  const buildReport = () => {
    if (Platform.OS === "web") {
      return {
        platform: "web",
        riskLevel: "LOW",
        flags: ["WEB_RUNTIME"],
      };
    }
    const appOwnership = Constants?.appOwnership || "unknown";
    const executionEnv = Constants?.executionEnvironment || "unknown";
    const isDev = typeof __DEV__ !== "undefined" && __DEV__;
    const applicationId = Application?.applicationId || "";
    const isDevice = Device?.isDevice ?? true;
    const flags = [];
    let riskScore = 0;

    if (!isDevice) {
      flags.push("EMULATOR_OR_SIMULATOR");
      riskScore += 2;
    }
    if (isDev || appOwnership !== "standalone") {
      flags.push("NON_RELEASE_BUILD");
      riskScore += 1;
    }
    if (Platform.OS === "android" && expectedAndroidPackage && applicationId) {
      if (applicationId !== expectedAndroidPackage) {
        flags.push("ANDROID_PACKAGE_MISMATCH");
        riskScore += 3;
      }
    }
    if (Platform.OS === "ios" && expectedIosBundle && applicationId) {
      if (applicationId !== expectedIosBundle) {
        flags.push("IOS_BUNDLE_MISMATCH");
        riskScore += 3;
      }
    }

    const riskLevel = riskScore >= 4 ? "HIGH" : riskScore >= 2 ? "MEDIUM" : "LOW";
    return {
      platform: Platform.OS,
      appOwnership,
      executionEnv,
      applicationId,
      isDevice,
      isDev,
      flags,
      riskLevel,
    };
  };

  const memoReport = useMemo(buildReport, [
    expectedAndroidPackage,
    expectedIosBundle,
  ]);

  useEffect(() => {
    setReport(memoReport);
    if (memoReport?.riskLevel && memoReport.riskLevel !== "LOW") {
      if (typeof onRisk === "function") {
        onRisk(memoReport);
      }
      console.warn("App integrity risk detected:", memoReport);
    }
  }, [memoReport, onRisk]);

  return report;
};
