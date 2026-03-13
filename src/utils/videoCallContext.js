import React, { createContext, useContext } from "react";
import VideoCall from "@/components/VideoCall";
import { useVideoCall } from "@/utils/useVideoCall";

const VideoCallContext = createContext(null);

export const VideoCallProvider = ({ children }) => {
  const videoCall = useVideoCall();
  const {
    currentCall,
    incomingCall,
    callStatus,
    callDuration,
    isMinimized,
    isPremium,
    answerCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
    toggleCamera,
    toggleHold,
    toggleMinimize,
    markCallConnected,
  } = videoCall;

  return (
    <VideoCallContext.Provider value={videoCall}>
      {children}
      <VideoCall
        isActive={Boolean(currentCall)}
        incomingCall={incomingCall}
        participantName={currentCall?.participantName}
        participantRole={currentCall?.participantRole}
        callMode={currentCall?.mode || "video"}
        callStatus={callStatus}
        callDuration={callDuration}
        callType={currentCall?.type || "consultation"}
        sessionId={currentCall?.sessionId}
        remoteVideoUrl={currentCall?.remoteVideoUrl}
        callSession={currentCall?.callSession}
        isPremium={isPremium}
        isMinimized={isMinimized}
        onToggleMinimize={toggleMinimize}
        onAcceptCall={() => {
          if (incomingCall?.sessionId) {
            answerCall(incomingCall.sessionId, {
              participantName: incomingCall.participantName,
              participantRole: incomingCall.participantRole,
              participantId: incomingCall.participantId,
              type: incomingCall.type,
              mode: incomingCall.mode,
            });
          }
        }}
        onRejectCall={() => {
          if (incomingCall?.sessionId) {
            rejectCall(incomingCall.sessionId);
          }
        }}
        onEndCall={() => endCall()}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleCamera={toggleCamera}
        onToggleHold={toggleHold}
        onRemoteJoined={() => markCallConnected()}
        onRemoteLeft={() => {}}
      />
    </VideoCallContext.Provider>
  );
};

export const useVideoCallContext = () => {
  const ctx = useContext(VideoCallContext);
  if (!ctx) {
    throw new Error("VideoCallProvider is missing.");
  }
  return ctx;
};
