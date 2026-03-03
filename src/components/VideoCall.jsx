import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  Image,
  Switch,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import Constants from "expo-constants";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RotateCcw,
  MessageCircle,
  Share,
  Settings,
  Minimize2,
  Crown,
  PauseCircle,
} from "lucide-react-native";

import { useAppTheme } from "@/components/ThemeProvider";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const STREAM_PREFERRED =
  String(process.env.EXPO_PUBLIC_CALL_PROVIDER || "stream").toLowerCase() === "stream";

export default function VideoCall({
  isActive = false,
  participantName = "Unknown",
  participantRole = "Patient",
  callMode = "video",
  callStatus = "active",
  incomingCall = null,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleVideo,
  onToggleAudio,
  onToggleCamera,
  onToggleHold,
  callType = "consultation", // consultation, pharmacy, emergency
  callDuration = 0,
  isMinimized = false,
  onToggleMinimize,
  remoteVideoUrl,
  sessionId,
  callSession,
  isPremium = false,
  onRemoteJoined,
  onRemoteLeft,
}) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const streamClientRef = useRef(null);
  const streamCallRef = useRef(null);
  const streamUnsubscribersRef = useRef([]);
  const [streamSdk, setStreamSdk] = useState(null);
  const [streamClient, setStreamClient] = useState(null);
  const [streamCall, setStreamCall] = useState(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("front");
  const [isVideoEnabled, setIsVideoEnabled] = useState(callMode !== "audio");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  const previousStatesRef = useRef({ video: true, audio: true });
  const [isRecording, setIsRecording] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isRingtoneEnabled, setIsRingtoneEnabled] = useState(true);
  const [showIncomingBanner, setShowIncomingBanner] = useState(false);
  const isExpoGo = Constants.appOwnership === "expo";
  const streamSession = callSession?.provider === "stream" ? callSession : null;
  const hasStream =
    STREAM_PREFERRED &&
    Boolean(
      streamSession?.token &&
        streamSession?.apiKey &&
        streamSdk?.StreamVideoClient &&
        streamSdk?.StreamVideo &&
        streamSdk?.StreamCall &&
        streamSdk?.CallContent,
    );
  const canRecord = isPremium;
  const isAudioOnly = callMode === "audio";

  const normalizeUnsubscribe = (subscription) => {
    if (typeof subscription === "function") return subscription;
    if (subscription && typeof subscription.unsubscribe === "function") {
      return () => subscription.unsubscribe();
    }
    return () => undefined;
  };

  useEffect(() => {
    if (Platform.OS === "web" || isExpoGo) {
      setStreamSdk(null);
      return;
    }
    try {
      // eslint-disable-next-line global-require
      const mod = require("@stream-io/video-react-native-sdk");
      setStreamSdk(mod);
    } catch {
      setStreamSdk(null);
    }
  }, [isExpoGo]);

  useEffect(() => {
    if (!cameraPermission?.granted && isActive && isVideoEnabled) {
      requestCameraPermission();
    }
  }, [isActive, cameraPermission, isVideoEnabled]);

  useEffect(() => {
    if (callMode === "audio") {
      setIsVideoEnabled(false);
    }
  }, [callMode]);

  useEffect(() => {
    let mounted = true;
    const setupStream = async () => {
      if (!isActive || !hasStream) return;
      try {
        const { StreamVideoClient } = streamSdk;
        const resolvedUser =
          streamSession?.user?.id
            ? streamSession.user
            : {
                id: String(streamSession?.uid || streamSession?.userId || "unknown"),
                name: participantName || "User",
                image: null,
              };

        const client = new StreamVideoClient({
          apiKey: streamSession.apiKey,
          user: resolvedUser,
          token: streamSession.token,
        });
        const call = client.call(
          streamSession.callType || "default",
          streamSession.callId || streamSession.channel || String(sessionId || "default"),
        );
        await call.join({ create: true });
        if (callMode === "audio") {
          await call.camera?.disable?.();
        } else {
          await call.camera?.enable?.();
        }
        await call.microphone?.enable?.();

        const unsubs = [];
        unsubs.push(
          normalizeUnsubscribe(
            call.on?.("call.session_participant_joined", (event) => {
              const participantId =
                event?.participant?.user?.id ||
                event?.participant?.session_id ||
                "participant";
              onRemoteJoined?.(participantId);
            }),
          ),
        );
        unsubs.push(
          normalizeUnsubscribe(
            call.on?.("call.session_participant_left", () => {
              onRemoteLeft?.();
            }),
          ),
        );
        unsubs.push(
          normalizeUnsubscribe(
            call.on?.("call.ended", () => {
              onEndCall?.();
            }),
          ),
        );

        if (!mounted) {
          unsubs.forEach((fn) => fn());
          await call.leave?.();
          await client.disconnectUser?.();
          return;
        }

        streamUnsubscribersRef.current = unsubs;
        streamClientRef.current = client;
        streamCallRef.current = call;
        setStreamClient(client);
        setStreamCall(call);
        onRemoteJoined?.("stream-connected");
      } catch (error) {
        console.error("Stream call setup failed:", error);
      }
    };

    setupStream();
    return () => {
      mounted = false;
      streamUnsubscribersRef.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          // ignore unsubscribe failures
        }
      });
      streamUnsubscribersRef.current = [];
      const activeCall = streamCallRef.current;
      const activeClient = streamClientRef.current;
      streamCallRef.current = null;
      streamClientRef.current = null;
      setStreamCall(null);
      setStreamClient(null);
      Promise.resolve(activeCall?.leave?.()).catch(() => undefined);
      Promise.resolve(activeClient?.disconnectUser?.()).catch(() => undefined);
    };
  }, [
    isActive,
    hasStream,
    streamSdk,
    streamSession?.apiKey,
    streamSession?.token,
    streamSession?.callId,
    streamSession?.callType,
    streamSession?.channel,
    streamSession?.uid,
    streamSession?.userId,
    streamSession?.user?.id,
    streamSession?.user?.name,
    streamSession?.user?.image,
    callMode,
    participantName,
    sessionId,
  ]);

  useEffect(() => {
    // Auto-hide controls after 5 seconds
    if (showControls && isActive) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isActive]);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    if (hasStream) {
      streamCallRef.current?.camera?.flip?.();
    }
    onToggleCamera?.(facing === "back" ? "front" : "back");
  };

  const handleToggleVideo = () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    if (hasStream) {
      if (next) {
        streamCallRef.current?.camera?.enable?.();
      } else {
        streamCallRef.current?.camera?.disable?.();
      }
    }
    onToggleVideo?.(next);
  };

  const handleToggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    if (hasStream) {
      if (next) {
        streamCallRef.current?.microphone?.enable?.();
      } else {
        streamCallRef.current?.microphone?.disable?.();
      }
    }
    onToggleAudio?.(next);
  };

  const handleToggleHold = () => {
    if (!isOnHold) {
      previousStatesRef.current = { video: isVideoEnabled, audio: isAudioEnabled };
      if (isAudioEnabled) {
        handleToggleAudio();
      }
      if (isVideoEnabled) {
        handleToggleVideo();
      }
      setIsOnHold(true);
      onToggleHold?.(true);
      return;
    }

    const { video, audio } = previousStatesRef.current;
    if (audio !== isAudioEnabled) {
      handleToggleAudio();
    }
    if (video !== isVideoEnabled) {
      handleToggleVideo();
    }
    setIsOnHold(false);
    onToggleHold?.(false);
  };

  const handleEndCall = () => {
    Alert.alert("End Call", "Are you sure you want to end this call?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Call",
        style: "destructive",
        onPress: () => {
          onEndCall?.();
        },
      },
    ]);
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60, // Max 60 seconds
        quality: "720p",
      });

      // Save recording to session
      console.log("Recording saved:", video.uri);
    } catch (error) {
      console.error("Recording failed:", error);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallTypeColor = () => {
    switch (callType) {
      case "emergency":
        return theme.error;
      case "pharmacy":
        return theme.accent;
      default:
        return theme.success;
    }
  };

  const callStatusLabel = () => {
    switch (callStatus) {
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "incoming":
        return "Incoming...";
      default:
        return null;
    }
  };

  useEffect(() => {
    if (callStatus === "incoming" && incomingCall && !showIncomingBanner) {
      setShowIncomingBanner(true);
      const timer = setTimeout(() => {
        setShowIncomingBanner(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [callStatus, incomingCall, showIncomingBanner]);

  if (callStatus === "incoming" && incomingCall) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {showIncomingBanner && (
          <MotiView
            from={{ translateY: -20, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "timing", duration: 250 }}
            style={[
              styles.incomingBanner,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.incomingBannerContent}>
              {incomingCall.participantAvatar ? (
                <Image
                  source={{ uri: incomingCall.participantAvatar }}
                  style={styles.incomingBannerAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.incomingBannerAvatar,
                    { backgroundColor: getCallTypeColor() },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {incomingCall.participantName?.charAt(0)?.toUpperCase() || "C"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.incomingBannerTitle, { color: theme.text }]}>
                  Incoming {incomingCall.mode === "audio" ? "Audio" : "Video"} Call
                </Text>
                <Text style={[styles.incomingBannerSubtitle, { color: theme.textSecondary }]}>
                  {incomingCall.participantName}
                </Text>
              </View>
            </View>
          </MotiView>
        )}

        <View style={styles.incomingContainer}>
          {incomingCall.participantAvatar ? (
            <Image
              source={{ uri: incomingCall.participantAvatar }}
              style={styles.incomingAvatar}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: getCallTypeColor() },
              ]}
            >
              <Text style={styles.avatarText}>
                {incomingCall.participantName?.charAt(0)?.toUpperCase() || "C"}
              </Text>
            </View>
          )}
          <Text style={[styles.participantName, { color: theme.text }]}>
            {incomingCall.participantName}
          </Text>
          <Text style={[styles.participantRole, { color: theme.textSecondary }]}>
            {incomingCall.mode === "audio" ? "Audio call" : "Video call"} •{" "}
            {incomingCall.participantRole}
          </Text>

          <View style={styles.ringtoneRow}>
            <Text style={[styles.ringtoneLabel, { color: theme.textSecondary }]}>
              Ringtone
            </Text>
            <Switch
              value={isRingtoneEnabled}
              onValueChange={setIsRingtoneEnabled}
              thumbColor={isRingtoneEnabled ? theme.primary : theme.border}
              trackColor={{ true: `${theme.primary}55`, false: theme.surface }}
            />
          </View>

          <View style={styles.incomingActions}>
            <TouchableOpacity
              style={[styles.answerButton, { backgroundColor: theme.success }]}
              onPress={onAcceptCall}
            >
              <Phone color="#FFFFFF" size={28} />
              <Text style={styles.actionLabel}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, { backgroundColor: theme.error }]}
              onPress={onRejectCall}
            >
              <PhoneOff color="#FFFFFF" size={28} />
              <Text style={styles.actionLabel}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!isActive) return null;

  if (!cameraPermission?.granted && !isAudioOnly) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: theme.text }]}>
            Camera permission is required for video calls
          </Text>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        style={[
          styles.minimizedContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            top: insets.top + 60,
            right: 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={onToggleMinimize}
          activeOpacity={0.8}
        >
          <View style={styles.minimizedVideoContainer}>
            {isVideoEnabled ? (
              <CameraView
                style={styles.minimizedCamera}
                facing={facing}
                ref={cameraRef}
                mode="video"
              />
            ) : (
              <View
                style={[
                  styles.minimizedCamera,
                  { backgroundColor: theme.surface },
                ]}
              >
                <VideoOff color={theme.iconColor} size={20} />
              </View>
            )}
          </View>

          <View style={styles.minimizedInfo}>
            <Text style={[styles.minimizedName, { color: theme.text }]}>
              {participantName}
            </Text>
            <Text
              style={[styles.minimizedDuration, { color: theme.textSecondary }]}
            >
              {formatCallDuration(callDuration)}
            </Text>
          </View>

          <View style={styles.minimizedActions}>
            <TouchableOpacity
              style={[
                styles.minimizedActionButton,
                { backgroundColor: theme.error },
              ]}
              onPress={handleEndCall}
            >
              <PhoneOff color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  }

  if (hasStream && streamClient && streamCall) {
    const StreamVideoProvider = streamSdk?.StreamVideo;
    const StreamCallProvider = streamSdk?.StreamCall;
    const CallContent = streamSdk?.CallContent;
    if (StreamVideoProvider && StreamCallProvider && CallContent) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <StreamVideoProvider client={streamClient}>
            <StreamCallProvider call={streamCall}>
              <CallContent onHangupCallHandler={onEndCall} />
            </StreamCallProvider>
          </StreamVideoProvider>
          <TouchableOpacity
            style={[
              styles.streamMinimizeButton,
              { top: insets.top + 12, backgroundColor: theme.background + "CC" },
            ]}
            onPress={onToggleMinimize}
          >
            <Minimize2 color={theme.text} size={18} />
          </TouchableOpacity>
        </View>
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteVideoUrl && !isOnHold && !isAudioOnly ? (
          <View
            style={[
              styles.remoteVideo,
              {
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: getCallTypeColor() },
              ]}
            >
              <Text style={styles.avatarText}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.participantName, { color: theme.text }]}>
              {participantName}
            </Text>
            <Text
              style={[styles.participantRole, { color: theme.textSecondary }]}
            >
              {participantRole}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.remoteVideo,
              {
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: getCallTypeColor() },
              ]}
            >
              <Text style={styles.avatarText}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.participantName, { color: theme.text }]}>
              {participantName}
            </Text>
            <Text
              style={[styles.participantRole, { color: theme.textSecondary }]}
            >
              {participantRole}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (Picture in Picture) */}
      {!isAudioOnly && (
        <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        style={[
          styles.localVideoContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            top: insets.top + 60,
          },
        ]}
      >
        {isVideoEnabled ? (
          <CameraView
            style={styles.localVideo}
            facing={facing}
            ref={cameraRef}
            mode="video"
          />
        ) : (
          <View
            style={[
              styles.localVideo,
              {
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <VideoOff color={theme.iconColor} size={24} />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.switchCameraButton,
            { backgroundColor: theme.background + "CC" },
          ]}
          onPress={toggleCameraFacing}
        >
          <RotateCcw color={theme.text} size={16} />
        </TouchableOpacity>
      </MotiView>
      )}

      {/* Call Info Header */}
      <MotiView
        from={{ translateY: -50, opacity: 0 }}
        animate={{ translateY: 0, opacity: showControls ? 1 : 0 }}
        transition={{ type: "timing", duration: 300 }}
        style={[
          styles.callHeader,
          {
            backgroundColor: theme.background + "DD",
            top: insets.top,
          },
        ]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <View style={styles.callHeaderContent}>
          <View style={styles.callHeaderInfo}>
            <View
              style={[
                styles.callStatusDot,
                { backgroundColor: getCallTypeColor() },
              ]}
            />
            <Text style={[styles.callHeaderTitle, { color: theme.text }]}>
              {participantName}
            </Text>
            <Text
              style={[
                styles.callHeaderSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              {callStatusLabel() || formatCallDuration(callDuration)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.minimizeButton, { backgroundColor: theme.surface }]}
            onPress={onToggleMinimize}
          >
            <Minimize2 color={theme.iconColor} size={20} />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* Controls */}
      <TouchableOpacity
        style={styles.controlsOverlay}
        onPress={() => setShowControls(!showControls)}
        activeOpacity={1}
      >
        <MotiView
          from={{ translateY: 100, opacity: 0 }}
          animate={{ translateY: 0, opacity: showControls ? 1 : 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={[
            styles.controlsContainer,
            {
              backgroundColor: theme.background + "DD",
              bottom: insets.bottom,
            },
          ]}
          pointerEvents={showControls ? "auto" : "none"}
        >
          <View style={styles.primaryControls}>
            {/* Hold */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isOnHold ? theme.warning : theme.surface,
                },
              ]}
              onPress={handleToggleHold}
            >
              <PauseCircle color={isOnHold ? "#FFFFFF" : theme.iconColor} size={24} />
            </TouchableOpacity>
            {/* Audio Toggle */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isAudioEnabled ? theme.surface : theme.error,
                },
              ]}
              onPress={handleToggleAudio}
            >
              {isAudioEnabled ? (
                <Mic color={theme.iconColor} size={24} />
              ) : (
                <MicOff color="#FFFFFF" size={24} />
              )}
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={[styles.endCallButton, { backgroundColor: theme.error }]}
              onPress={handleEndCall}
            >
              <PhoneOff color="#FFFFFF" size={28} />
            </TouchableOpacity>

            {/* Video Toggle */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isVideoEnabled ? theme.surface : theme.error,
                },
              ]}
              onPress={handleToggleVideo}
            >
              {isVideoEnabled ? (
                <Video color={theme.iconColor} size={24} />
              ) : (
                <VideoOff color="#FFFFFF" size={24} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryControls}>
            {/* Recording */}
            <TouchableOpacity
              style={[
                styles.secondaryControlButton,
                {
                  backgroundColor: isRecording ? theme.error : theme.surface,
                  opacity: canRecord ? 1 : 0.6,
                },
              ]}
              onPress={
                canRecord
                  ? isRecording
                    ? stopRecording
                    : startRecording
                  : () =>
                      Alert.alert(
                        "Premium Feature",
                        "Recording is available for premium users only.",
                      )
              }
            >
              {canRecord ? (
                <View
                  style={[
                    styles.recordingIndicator,
                    {
                      backgroundColor: isRecording ? "#FFFFFF" : theme.error,
                    },
                  ]}
                />
              ) : (
                <Crown color={theme.iconColor} size={18} />
              )}
            </TouchableOpacity>

            {/* Chat */}
            <TouchableOpacity
              style={[
                styles.secondaryControlButton,
                { backgroundColor: theme.surface },
              ]}
            >
              <MessageCircle color={theme.iconColor} size={20} />
            </TouchableOpacity>

            {/* Share Screen */}
            <TouchableOpacity
              style={[
                styles.secondaryControlButton,
                { backgroundColor: theme.surface },
              ]}
            >
              <Share color={theme.iconColor} size={20} />
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              style={[
                styles.secondaryControlButton,
                { backgroundColor: theme.surface },
              ]}
            >
              <Settings color={theme.iconColor} size={20} />
            </TouchableOpacity>
          </View>
        </MotiView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  remoteVideoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  participantName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  participantRole: {
    fontSize: 16,
  },
  localVideoContainer: {
    position: "absolute",
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
  },
  localVideo: {
    flex: 1,
  },
  switchCameraButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  callHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  callHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  callHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  callStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  callHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  callHeaderSubtitle: {
    fontSize: 14,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: "flex-end",
  },
  controlsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  primaryControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  secondaryControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  minimizedContainer: {
    position: "absolute",
    width: 200,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  minimizedContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  minimizedVideoContainer: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  minimizedCamera: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  minimizedInfo: {
    flex: 1,
  },
  minimizedName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  minimizedDuration: {
    fontSize: 12,
  },
  minimizedActions: {
    marginLeft: 8,
  },
  minimizedActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  streamMinimizeButton: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  incomingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  incomingAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  incomingActions: {
    flexDirection: "row",
    marginTop: 24,
    gap: 20,
  },
  ringtoneRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ringtoneLabel: {
    fontSize: 12,
  },
  incomingBanner: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    zIndex: 2,
  },
  incomingBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  incomingBannerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  incomingBannerTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  incomingBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  answerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
