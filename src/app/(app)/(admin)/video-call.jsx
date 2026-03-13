import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Video, Phone } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useVideoCallContext as useVideoCall } from "@/utils/videoCallContext";
import apiClient from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/utils/i18n";

export default function AdminVideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { formatDateTime } = useI18n();
  const [participantId, setParticipantId] = useState(
    typeof params?.participantId === "string" ? params.participantId : "",
  );
  const [participantName, setParticipantName] = useState(
    typeof params?.participantName === "string" ? params.participantName : "",
  );
  const [participantRole, setParticipantRole] = useState(
    typeof params?.participantRole === "string" ? params.participantRole : "User",
  );
  const [callMode, setCallMode] = useState(
    typeof params?.mode === "string" ? params.mode : "video",
  );

  const {
    currentCall,
    incomingCall,
    callStatus,
    callDuration,
    endCall,
    answerCall,
    rejectCall,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleHold,
    markCallConnected,
    initiateCall,
  } = useVideoCall();

  const incomingSessionId =
    typeof params?.incomingSessionId === "string" ? params.incomingSessionId : "";
  const autoAnswer = String(params?.autoAnswer || "") === "1";

  useEffect(() => {
    if (!autoAnswer || !incomingSessionId) return;
    if (currentCall?.sessionId === incomingSessionId) return;
    answerCall(incomingSessionId, {
      participantName:
        typeof params?.participantName === "string" ? params.participantName : undefined,
      participantRole:
        typeof params?.participantRole === "string" ? params.participantRole : undefined,
      participantId:
        typeof params?.participantId === "string" ? params.participantId : undefined,
      type: typeof params?.callType === "string" ? params.callType : undefined,
      mode: typeof params?.mode === "string" ? params.mode : undefined,
    });
  }, [
    autoAnswer,
    incomingSessionId,
    answerCall,
    currentCall?.sessionId,
    params?.participantName,
    params?.participantRole,
    params?.participantId,
    params?.callType,
    params?.mode,
  ]);

  const historyQuery = useQuery({
    queryKey: ["video-call-history", "admin"],
    queryFn: () => apiClient.getVideoCallHistory(),
  });

  const callHistory = historyQuery.data?.calls || [];

  const statusColor = (status) => {
    const value = String(status || "").toUpperCase();
    if (value === "ACTIVE" || value === "ANSWERED") return theme.success;
    if (value === "RINGING" || value === "CONNECTING") return theme.warning;
    if (value === "REJECTED" || value === "MISSED") return theme.error;
    return theme.textSecondary;
  };

  const handleStartCall = async () => {
    if (!participantId.trim()) {
      showToast("Enter participant user ID.", "warning");
      return;
    }
    try {
      await initiateCall({
        participantId: participantId.trim(),
        participantName: participantName.trim() || "User",
        participantRole: participantRole.trim() || "User",
        type: "consultation",
        role: "host",
        mode: callMode,
        minutes: 30,
      });
    } catch (error) {
      showToast(error.message || "Unable to start call.", "error");
    }
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
            Admin Video Call
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
            Participant User ID
          </Text>
          <TextInput
            value={participantId}
            onChangeText={setParticipantId}
            placeholder="Paste user ID"
            placeholderTextColor={theme.textSecondary}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              marginBottom: 10,
            }}
          />
          <TextInput
            value={participantName}
            onChangeText={setParticipantName}
            placeholder="Participant name (optional)"
            placeholderTextColor={theme.textSecondary}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              marginBottom: 10,
            }}
          />
          <TextInput
            value={participantRole}
            onChangeText={setParticipantRole}
            placeholder="Participant role (optional)"
            placeholderTextColor={theme.textSecondary}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              marginBottom: 10,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: callMode === "video" ? `${theme.primary}20` : theme.surface,
                borderWidth: 1,
                borderColor: callMode === "video" ? theme.primary : theme.border,
                alignItems: "center",
              }}
              onPress={() => setCallMode("video")}
            >
              <Text style={{ color: callMode === "video" ? theme.primary : theme.textSecondary }}>
                Video
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: callMode === "audio" ? `${theme.primary}20` : theme.surface,
                borderWidth: 1,
                borderColor: callMode === "audio" ? theme.primary : theme.border,
                alignItems: "center",
              }}
              onPress={() => setCallMode("audio")}
            >
              <Text style={{ color: callMode === "audio" ? theme.primary : theme.textSecondary }}>
                Audio
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
            onPress={handleStartCall}
          >
            <Phone color="#FFFFFF" size={16} />
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>Start Call</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            Recent Calls
          </Text>
          {(callHistory || []).slice(0, 8).map((call) => (
            <View
              key={call.id}
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.text, fontSize: 12 }}>{call.callType || "call"}</Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: `${statusColor(call.status)}20`,
                  }}
                >
                  <Text style={{ color: statusColor(call.status), fontSize: 10 }}>
                    {call.status || "UNKNOWN"}
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                {formatDateTime ? formatDateTime(call.createdAt) : call.createdAt}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}
