import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { router } from "expo-router";
import apiClient from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";

const VIDEO_CALL_CATEGORY = "VIDEO_CALL_ACTIONS";
const ACTION_ANSWER = "ANSWER_CALL";
const ACTION_REJECT = "REJECT_CALL";

const parseData = (data) => {
  if (!data) return {};
  if (typeof data === "object") return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return {};
};

const roleToVideoRoute = (role) => {
  const key = String(role || "").toUpperCase();
  if (key === "PATIENT") return "/(app)/(patient)/video-call";
  if (key === "MEDIC") return "/(app)/(medic)/video-call";
  if (key === "HOSPITAL_ADMIN") return "/(app)/(hospital)/video-call";
  if (key === "PHARMACY_ADMIN") return "/(app)/(pharmacy)/video-call";
  if (key === "SUPER_ADMIN") return "/(app)/(admin)/video-call";
  return "/(app)/(shared)/notifications";
};

const buildVideoRoute = (role, data, autoAnswer = false) => {
  const base = roleToVideoRoute(role);
  const params = new URLSearchParams();
  if (data?.sessionId) params.append("incomingSessionId", String(data.sessionId));
  if (data?.callerId) params.append("participantId", String(data.callerId));
  if (data?.callerName) params.append("participantName", String(data.callerName));
  if (data?.callerRole) params.append("participantRole", String(data.callerRole));
  if (data?.callType) params.append("callType", String(data.callType));
  if (data?.mode) params.append("mode", String(data.mode));
  params.append("autoAnswer", autoAnswer ? "1" : "0");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const setupCategories = async () => {
  await Notifications.setNotificationCategoryAsync(VIDEO_CALL_CATEGORY, [
    {
      identifier: ACTION_ANSWER,
      buttonTitle: "Accept",
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_REJECT,
      buttonTitle: "Reject",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
};

const ensureVideoCallCategory = async (content) => {
  if (content?.categoryIdentifier === VIDEO_CALL_CATEGORY) return;
  const data = parseData(content?.data);
  const type = String(data?.type || content?.data?.type || "").toLowerCase();
  if (type !== "video_call") return;
  if (data?._actionified) return;

  // Re-show with action buttons when incoming call arrives in foreground.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content?.title || "Incoming Call",
      body: content?.body || "You have an incoming call.",
      data: { ...data, _actionified: true },
      categoryIdentifier: VIDEO_CALL_CATEGORY,
      sound: "default",
    },
    trigger: null,
  });
};

const handleNotificationAction = async (response) => {
  const actionId = response?.actionIdentifier;
  const content = response?.notification?.request?.content;
  const data = parseData(content?.data);
  const sessionId = data?.sessionId;
  const auth = useAuthStore.getState().auth;
  const userId = auth?.user?.id;
  const role = auth?.user?.role;

  if (!sessionId) {
    router.push("/(app)/(shared)/notifications");
    return;
  }

  if (actionId === ACTION_ANSWER) {
    try {
      router.push(buildVideoRoute(role, data, true));
    } catch {
      // Ignore and still navigate user to call screen.
    }
    return;
  }

  if (actionId === ACTION_REJECT) {
    try {
      await apiClient.request(`/video-calls/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify({
          status: "REJECTED",
          ended_by: userId,
        }),
      });
    } catch {
      // Ignore rejection errors on notification action.
    }
    return;
  }

  // Default notification tap
  router.push(buildVideoRoute(role, data, false));
};

export const registerDeviceToken = async () => {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenInfo = await Notifications.getDevicePushTokenAsync();
  const token = tokenInfo?.data;
  if (!token) return null;

  try {
    await apiClient.request("/notifications/register-device", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch {
    // Silent fail; app can continue without push registration.
  }

  return token;
};

export const setupPushHandlers = () => {
  if (Platform.OS === "web") return () => {};

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  setupCategories().catch(() => undefined);

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const content = notification?.request?.content;
    ensureVideoCallCategory(content).catch(() => undefined);
    const data = parseData(content?.data);
    const badgeValue = Number(data?.badge);
    if (Number.isFinite(badgeValue)) {
      Notifications.setBadgeCountAsync(Math.max(0, badgeValue)).catch(() => undefined);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationAction(response).catch(() => undefined);
  });

  return () => {
    try {
      receivedSub.remove();
      responseSub.remove();
    } catch {
      // no-op
    }
  };
};

export const syncBadgeCount = async (count) => {
  if (Platform.OS === "web") return;
  const value = Number(count);
  if (!Number.isFinite(value)) return;
  await Notifications.setBadgeCountAsync(Math.max(0, value)).catch(() => undefined);
};
