import { Platform } from "react-native";

const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const trimmed = raw.replace(/\/+$/, "");
  if (Platform.OS === "android") {
    return trimmed
      .replace("http://localhost:", "http://10.0.2.2:")
      .replace("http://127.0.0.1:", "http://10.0.2.2:");
  }
  return trimmed;
};

const getPreferredBaseUrl = () => {
  const primary = normalizeBaseUrl(process.env.EXPO_PUBLIC_BASE_URL);
  if (primary) return primary;

  const fallbacks = String(process.env.EXPO_PUBLIC_BASE_URLS || "")
    .split(",")
    .map((entry) => normalizeBaseUrl(entry))
    .filter(Boolean);
  return fallbacks[0] || "";
};

export const resolveMediaUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("file://") ||
    raw.startsWith("content://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const isUploadsPath = raw.startsWith("/uploads/") || raw.startsWith("uploads/");
  if (!isUploadsPath) return raw;

  const base = getPreferredBaseUrl();
  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}/${raw.replace(/^\/+/, "")}`;
};

