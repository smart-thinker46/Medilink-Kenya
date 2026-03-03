import React from "react";
import { Platform } from "react-native";
import WebTabBar from "@/components/WebTabBar";
import MobileTabBar from "@/components/MobileTabBar";

export default function ResponsiveTabBar(props) {
  if (Platform.OS === "web") {
    return <WebTabBar {...props} />;
  }
  return <MobileTabBar {...props} />;
}
