import { useState, useRef, useCallback, useEffect } from "react";
import { Alert, Platform } from "react-native";
import Constants from "expo-constants";
import io from "socket.io-client";
import { useAudioPlayer, useAudioRecorder, RecordingPresets } from "expo-audio";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/utils/auth/store";
import ApiClient from "@/utils/api";
import { canContact, normalizeRole } from "@/utils/communicationRules";
import { exportReceipt } from "@/utils/receiptExport";
import { addCallKeepListeners, showIncomingCall, endIncomingCall } from "@/utils/callkeep";

export const useVideoCall = () => {
  const { auth } = useAuthStore();
  const currentRole = normalizeRole(auth?.user?.role);
  const userId = auth?.user?.id;
  const queryClient = useQueryClient();
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle | incoming | ringing | connecting | active
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const intervalRef = useRef(null);
  const incomingTimeoutRef = useRef(null);
  const outgoingTimeoutRef = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const getNotifications = useCallback(() => {
    if (Platform.OS === "web") return null;
    if (Constants.appOwnership === "expo") return null;
    try {
      // eslint-disable-next-line global-require
      return require("expo-notifications");
    } catch {
      return null;
    }
  }, []);

  const invalidateCallHistory = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["video-call-history"] });
  }, [queryClient]);

  useEffect(() => {
    if (!auth?.token) {
      setIsPremium(currentRole === "SUPER_ADMIN");
      setProfileLoaded(true);
      return;
    }
    let mounted = true;
    ApiClient.getProfile()
      .then((data) => {
        const user = data?.user || data?.user?.user || data?.user;
        const premiumFlag = Boolean(user?.subscriptionActive);
        if (mounted) {
          setIsPremium(premiumFlag || currentRole === "SUPER_ADMIN");
          setProfileLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsPremium(currentRole === "SUPER_ADMIN");
          setProfileLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [auth?.token, currentRole]);

  useEffect(() => {
    if (Platform.OS === "web") {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => undefined);
      }
      return;
    }
    const Notifications = getNotifications();
    if (!Notifications) return;
    Notifications.requestPermissionsAsync().catch(() => undefined);
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, [getNotifications]);

  useEffect(() => {
    if (!auth?.token || !userId) return;
    const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";
    const baseUrl = rawBaseUrl.replace(/\/api\/?$/i, "");
    if (!baseUrl) return;
    const socket = io(baseUrl, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("register", { userId });
    });

    socket.on("notification", async (payload) => {
      if (payload?.type !== "video_call") return;
      const data = payload?.data || {};
      if (!data?.sessionId) return;
      const status = String(data?.status || "").toUpperCase();
      if (status) {
        if (status === "ANSWERED") {
          setCallStatus("connecting");
          return;
        }
        if (["REJECTED", "MISSED", "ENDED"].includes(status)) {
          setCurrentCall((prev) =>
            prev?.sessionId === data.sessionId ? null : prev,
          );
          setIncomingCall(null);
          setCallStatus("idle");
          if (outgoingTimeoutRef.current) {
            clearTimeout(outgoingTimeoutRef.current);
            outgoingTimeoutRef.current = null;
          }
          return;
        }
      }
      if (currentCall?.sessionId === data.sessionId) return;

      setIncomingCall({
        sessionId: data.sessionId,
        participantId: data.callerId,
        participantName: data.callerName || "Unknown",
        participantAvatar: data.callerAvatar || data.callerPhoto || data.callerImage || null,
        participantRole: data.callerRole || "Caller",
        type: data.callType || "consultation",
        mode: data.mode || "video",
      });
      setCallStatus("incoming");
      showIncomingCall({
        sessionId: data.sessionId,
        handle: data.callerName || "Medilink",
        hasVideo: data.mode !== "audio",
      });

      if (incomingTimeoutRef.current) {
        clearTimeout(incomingTimeoutRef.current);
      }
      incomingTimeoutRef.current = setTimeout(() => {
        rejectCall(data.sessionId, { status: "MISSED", notifyCaller: true, callerId: data.callerId });
      }, 30000);

      if (Platform.OS === "web") {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(payload.title || "Incoming Call", {
            body: payload.message || "You have an incoming call.",
          });
        }
      } else {
        const Notifications = getNotifications();
        if (Notifications) {
          await Notifications.presentNotificationAsync({
            title: payload.title || "Incoming Call",
            body: payload.message || "You have an incoming call.",
            sound: "default",
          });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.token, userId, currentCall?.sessionId]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopCallTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Initialize video call
  const initiateCall = useCallback(
    async (callData) => {
      try {
        const minutes = callData?.minutes || 30;
        const amount = callData?.amount || Math.ceil(minutes / 30) * 100;
        let paymentId = callData?.paymentId;
        const paymentMethod = callData?.paymentMethod || "intasend";
        const currency = callData?.currency || "KES";

        if (!isPremium && currentRole !== "SUPER_ADMIN") {
          if (!paymentId) {
            const confirmation = await new Promise((resolve) => {
              Alert.alert(
                "Premium Video Call",
                `Video calls cost KES ${amount} per ${minutes} minutes. Continue?`,
                [
                  { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                  { text: "Pay & Start", onPress: () => resolve(true) },
                ],
              );
            });
            if (!confirmation) return { success: false };

            const payment = await ApiClient.createPayment({
              amount,
              currency,
              method: paymentMethod,
              type: "VIDEO_CALL",
              minutes,
              phone: auth?.user?.phone,
            });
            paymentId = payment?.id;
            if (payment) {
              try {
                await exportReceipt({
                  payment,
                  payer: { email: payment.payerEmail },
                  recipient: {
                    name: callData?.participantName,
                    role: callData?.participantRole,
                  },
                });
              } catch {
                // ignore receipt failures
              }
            }
          }
        }

        // Create call session
        const response = await ApiClient.request("/video-calls", {
          method: "POST",
          body: JSON.stringify({
            participant_id: callData.participantId,
            call_type: callData.type, // consultation, pharmacy, emergency
            appointment_id: callData.appointmentId,
            payment_id: paymentId,
            minutes,
            amount,
            mode: callData.mode || "video",
          }),
        });

        if (response.success) {
          let tokenResponse = null;
          try {
            tokenResponse = await ApiClient.getVideoCallToken({
              channel: response.sessionId,
              role: callData?.role || "host",
            });
          } catch {
            tokenResponse = null;
          }
          setCurrentCall({
            ...callData,
            sessionId: response.sessionId,
            remoteVideoUrl: response.remoteVideoUrl,
            isActive: true,
            callSession: tokenResponse,
            minutes,
            isPremium: isPremium || currentRole === "SUPER_ADMIN",
          });
          setCallStatus("ringing");
          setIsOnHold(false);
          if (outgoingTimeoutRef.current) {
            clearTimeout(outgoingTimeoutRef.current);
          }
          outgoingTimeoutRef.current = setTimeout(() => {
            endCall({ status: "MISSED" });
          }, 30000);

          // Notify participant
          await ApiClient.request("/notifications", {
            method: "POST",
            body: JSON.stringify({
              user_id: callData.participantId,
              title: `Incoming ${callData.type} call`,
              message: `${auth?.user?.firstName || ""} ${auth?.user?.lastName || ""} is calling you`,
              type: "video_call",
              data: {
                type: "video_call",
                sessionId: response.sessionId,
                callerId: auth?.user?.id,
                callerName: `${auth?.user?.firstName || ""} ${auth?.user?.lastName || ""}`.trim(),
                callerRole: auth?.user?.role,
                callerAvatar:
                  auth?.user?.profilePhoto ||
                  auth?.user?.avatarUrl ||
                  auth?.user?.photoUrl ||
                  null,
                callType: callData.type,
                mode: callData.mode || "video",
              },
            }),
          });

          return response;
        }

        if (response?.requiresPayment) {
          Alert.alert(
            "Payment Required",
            `KES ${response.amount} is required to start this call.`,
          );
        }
      } catch (error) {
        console.error("Failed to initiate call:", error);
        Alert.alert("Error", "Failed to start video call. Please try again.");
        throw error;
      }
    },
    [auth?.user, startCallTimer, isPremium, currentRole],
  );

  // Answer incoming call
  const answerCall = useCallback(
    async (sessionId, options = {}) => {
      try {
        const response = await ApiClient.request(
          `/video-calls/${sessionId}/answer`,
          {
            method: "POST",
          },
        );

        if (response.success) {
          let tokenResponse = null;
          try {
            tokenResponse = await ApiClient.getVideoCallToken({
              channel: sessionId,
              role: "audience",
            });
          } catch {
            tokenResponse = null;
          }
          setCurrentCall({
            ...response.callData,
            sessionId,
            isActive: true,
            callSession: tokenResponse,
            isPremium: isPremium || currentRole === "SUPER_ADMIN",
            mode: options.mode || response.callData?.mode || "video",
            participantName: options.participantName,
            participantRole: options.participantRole,
            participantId: options.participantId,
            type: options.type || response.callData?.callType,
          });
          setIncomingCall(null);
          setCallStatus("connecting");
          setIsOnHold(false);
          if (incomingTimeoutRef.current) {
            clearTimeout(incomingTimeoutRef.current);
            incomingTimeoutRef.current = null;
          }
        }
      } catch (error) {
        console.error("Failed to answer call:", error);
        Alert.alert("Error", "Failed to answer call.");
      }
    },
    [startCallTimer, isPremium, currentRole],
  );

  const rejectCall = useCallback(
    async (sessionId, options = {}) => {
      try {
        const status = options.status || "REJECTED";
        await ApiClient.request(`/video-calls/${sessionId}/end`, {
          method: "POST",
          body: JSON.stringify({
            status,
            ended_by: auth?.user?.id,
          }),
        });
        if (options.notifyCaller && options.callerId) {
          await ApiClient.request("/notifications", {
            method: "POST",
            body: JSON.stringify({
              user_id: options.callerId,
              title: status === "MISSED" ? "Missed call" : "Call declined",
              message:
                status === "MISSED"
                  ? "You have a missed call."
                  : "Your call was declined.",
              type: "video_call",
              data: { status, sessionId },
            }),
          });
        }
      } catch (error) {
        console.error("Failed to reject call:", error);
      } finally {
        if (incomingTimeoutRef.current) {
          clearTimeout(incomingTimeoutRef.current);
          incomingTimeoutRef.current = null;
        }
        setIncomingCall(null);
        setCallStatus("idle");
        endIncomingCall(sessionId);
        invalidateCallHistory();
      }
    },
    [auth?.user, invalidateCallHistory],
  );

  useEffect(() => {
    const cleanup = addCallKeepListeners({
      onAnswer: (sessionId) => {
        if (incomingCall?.sessionId === sessionId) {
          answerCall(sessionId, {
            participantName: incomingCall.participantName,
            participantRole: incomingCall.participantRole,
            participantId: incomingCall.participantId,
            type: incomingCall.type,
            mode: incomingCall.mode,
          });
        }
      },
      onReject: (sessionId) => {
        if (incomingCall?.sessionId === sessionId) {
          rejectCall(sessionId);
        }
      },
    });
    return cleanup;
  }, [incomingCall, answerCall, rejectCall]);

  const markCallConnected = useCallback(() => {
    if (callStatus !== "active") {
      setCallStatus("active");
    }
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    if (!intervalRef.current) {
      startCallTimer();
    }
  }, [callStatus, startCallTimer]);

  // End video call
  const endCall = useCallback(
    async (options = {}) => {
      try {
        if (currentCall?.sessionId) {
          await ApiClient.request(`/video-calls/${currentCall.sessionId}/end`, {
            method: "POST",
            body: JSON.stringify({
              duration: callDuration,
              ended_by: auth?.user?.id,
              status: options.status || "ENDED",
            }),
          });
          if (options.status === "MISSED" && currentCall?.participantId) {
            await ApiClient.request("/notifications", {
              method: "POST",
              body: JSON.stringify({
                user_id: currentCall.participantId,
                title: "Missed call",
                message: "You have a missed call.",
                type: "video_call",
                data: { status: "MISSED", sessionId: currentCall.sessionId },
              }),
            });
          }
        }
      } catch (error) {
        console.error("Failed to end call properly:", error);
      } finally {
        setCurrentCall(null);
        setCallStatus("idle");
        setIsMinimized(false);
        setIsRecording(false);
        setIsOnHold(false);
        stopCallTimer();
        invalidateCallHistory();
        if (outgoingTimeoutRef.current) {
          clearTimeout(outgoingTimeoutRef.current);
          outgoingTimeoutRef.current = null;
        }
      }
    },
    [currentCall, callDuration, auth?.user, stopCallTimer, invalidateCallHistory],
  );

  // Toggle video
  const toggleVideo = useCallback(
    async (enabled) => {
      try {
        if (currentCall?.sessionId) {
          await ApiClient.request(
            `/video-calls/${currentCall.sessionId}/toggle-video`,
            {
              method: "POST",
              body: JSON.stringify({ enabled }),
            },
          );
        }
      } catch (error) {
        console.error("Failed to toggle video:", error);
      }
    },
    [currentCall],
  );

  // Toggle audio
  const toggleAudio = useCallback(
    async (enabled) => {
      try {
        if (currentCall?.sessionId) {
          await ApiClient.request(
            `/video-calls/${currentCall.sessionId}/toggle-audio`,
            {
              method: "POST",
              body: JSON.stringify({ enabled }),
            },
          );
        }
      } catch (error) {
        console.error("Failed to toggle audio:", error);
      }
    },
    [currentCall],
  );

  // Toggle camera (front/back)
  const toggleCamera = useCallback(
    async (facing) => {
      try {
        if (currentCall?.sessionId) {
          await ApiClient.request(
            `/video-calls/${currentCall.sessionId}/toggle-camera`,
            {
              method: "POST",
              body: JSON.stringify({ facing }),
            },
          );
        }
      } catch (error) {
        console.error("Failed to toggle camera:", error);
      }
    },
    [currentCall],
  );

  const toggleHold = useCallback(
    async (nextHold) => {
      try {
        if (currentCall?.sessionId) {
          await ApiClient.request(`/video-calls/${currentCall.sessionId}/hold`, {
            method: "POST",
            body: JSON.stringify({ isOnHold: Boolean(nextHold) }),
          });
        }
      } catch (error) {
        console.error("Failed to toggle hold:", error);
      } finally {
        setIsOnHold(Boolean(nextHold));
      }
    },
    [currentCall],
  );

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (currentCall?.sessionId) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);

        await ApiClient.request(
          `/video-calls/${currentCall.sessionId}/start-recording`,
          {
            method: "POST",
          },
        );
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording.");
    }
  }, [currentCall, audioRecorder]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (currentCall?.sessionId && isRecording) {
        const recording = await audioRecorder.stop();
        setIsRecording(false);

        // Upload recording
        const formData = new FormData();
        formData.append("audio", {
          uri: recording.uri,
          type: "audio/m4a",
          name: `call-recording-${currentCall.sessionId}.m4a`,
        });

        await ApiClient.request(
          `/video-calls/${currentCall.sessionId}/upload-recording`,
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        await ApiClient.request(
          `/video-calls/${currentCall.sessionId}/stop-recording`,
          {
            method: "POST",
          },
        );
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  }, [currentCall, audioRecorder, isRecording]);

  // Send chat message during call
  const sendChatMessage = useCallback(
    async (message) => {
      try {
        if (currentCall?.sessionId) {
          const response = await ApiClient.request(
            `/video-calls/${currentCall.sessionId}/chat`,
            {
              method: "POST",
              body: JSON.stringify({
                message,
                sender_id: auth?.user?.id,
              }),
            },
          );

          return response;
        }
      } catch (error) {
        console.error("Failed to send chat message:", error);
        throw error;
      }
    },
    [currentCall, auth?.user],
  );

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Get call history
  const getCallHistory = useCallback(async () => {
    try {
      const response = await ApiClient.request("/video-calls/history");
      return response.calls || [];
    } catch (error) {
      console.error("Failed to get call history:", error);
      return [];
    }
  }, []);

  // Emergency call
  const makeEmergencyCall = useCallback(
    async (hospitalId, options = {}) => {
      try {
        if (!canContact(currentRole, "HOSPITAL_ADMIN")) {
          Alert.alert("Not Allowed", "You are not allowed to call hospitals.");
          return { success: false };
        }
        if (!hospitalId) {
          Alert.alert("Missing Hospital", "Please select a hospital first.");
          return { success: false };
        }
        return initiateCall({
          participantId: hospitalId,
          participantName: options.participantName || "Emergency Staff",
          participantRole: "Hospital",
          type: "emergency",
          role: "host",
          minutes: options.minutes || 30,
          paymentMethod: options.paymentMethod,
          mode: options.mode || "video",
        });
      } catch (error) {
        console.error("Failed to make emergency call:", error);
        Alert.alert(
          "Emergency Call Failed",
          "Unable to connect to emergency services. Please call directly.",
        );
        throw error;
      }
    },
    [initiateCall, currentRole],
  );

  // Pharmacy consultation call
  const makePharmacyCall = useCallback(
    async (pharmacyId, orderId = null, options = {}) => {
      try {
        if (!canContact(currentRole, "PHARMACY_ADMIN")) {
          Alert.alert("Not Allowed", "You are not allowed to call pharmacies.");
          return { success: false };
        }
        if (!pharmacyId) {
          Alert.alert("Missing Pharmacy", "Please select a pharmacy first.");
          return { success: false };
        }
        return initiateCall({
          participantId: pharmacyId,
          participantName: options.participantName || "Pharmacist",
          participantRole: "Pharmacy",
          type: "pharmacy",
          orderId,
          role: "host",
          minutes: options.minutes || 30,
          paymentMethod: options.paymentMethod,
          mode: options.mode || "video",
        });
      } catch (error) {
        console.error("Failed to make pharmacy call:", error);
        Alert.alert(
          "Error",
          "Unable to connect to pharmacist. Please try again.",
        );
        throw error;
      }
    },
    [initiateCall, currentRole],
  );

  // Medical consultation call
  const makeMedicalCall = useCallback(
    async (medicId, appointmentId, options = {}) => {
      try {
        if (!canContact(currentRole, "MEDIC")) {
          Alert.alert("Not Allowed", "You are not allowed to call medics.");
          return { success: false };
        }
        if (!medicId) {
          Alert.alert("Missing Medic", "Please select a medic first.");
          return { success: false };
        }
        return initiateCall({
          participantId: medicId,
          participantName: options.participantName || "Medic",
          participantRole: options.participantRole || "Medic",
          type: "consultation",
          appointmentId,
          role: "host",
          minutes: options.minutes || 30,
          paymentMethod: options.paymentMethod,
          mode: options.mode || "video",
        });
      } catch (error) {
        console.error("Failed to make medical call:", error);
        Alert.alert("Error", "Unable to connect to doctor. Please try again.");
        throw error;
      }
    },
    [initiateCall, currentRole],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
      if (incomingTimeoutRef.current) {
        clearTimeout(incomingTimeoutRef.current);
        incomingTimeoutRef.current = null;
      }
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }
    };
  }, [stopCallTimer]);

  return {
    // State
    currentCall,
    incomingCall,
    callStatus,
    callDuration,
    isMinimized,
    isRecording,
    isPremium,
    profileLoaded,
    isOnHold,

    // Actions
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    markCallConnected,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleHold,
    startRecording,
    stopRecording,
    sendChatMessage,
    toggleMinimize,

    // Specialized calls
    makeEmergencyCall,
    makePharmacyCall,
    makeMedicalCall,

    // Utility
    getCallHistory,
  };
};
