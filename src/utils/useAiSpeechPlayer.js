import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";

import apiClient from "@/utils/api";

const normalizeSpeechText = (value, maxChars = 1800) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.slice(0, maxChars);
};
const BASE64_ENCODING = FileSystem?.EncodingType?.Base64 || "base64";

export default function useAiSpeechPlayer({
  preferDeviceSpeech = true,
  defaultLanguage = "en",
  onWarn,
  onError,
  onSuccess,
} = {}) {
  const soundRef = useRef(null);
  const tempAudioPathRef = useRef("");
  const tempAudioUrlRef = useRef("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState("");
  const isWeb = Platform.OS === "web";

  const cleanupSound = useCallback(async () => {
    try {
      await Speech.stop();
    } catch {
      // ignore stop errors
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore cleanup errors
      }
      soundRef.current = null;
    }
    const tempPath = String(tempAudioPathRef.current || "");
    if (tempPath) {
      tempAudioPathRef.current = "";
      if (!isWeb) {
        await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
      }
    }
    const tempUrl = String(tempAudioUrlRef.current || "");
    if (tempUrl) {
      tempAudioUrlRef.current = "";
      if (isWeb && typeof URL !== "undefined") {
        URL.revokeObjectURL(tempUrl);
      }
    }
    setIsPlaying(false);
  }, [isWeb]);

  useEffect(() => {
    return () => {
      cleanupSound().catch(() => undefined);
    };
  }, [cleanupSound]);

  const ttsMutation = useMutation({
    mutationFn: (payload) => {
      const isObjectPayload = payload && typeof payload === "object";
      const text = normalizeSpeechText(isObjectPayload ? payload?.text : payload);
      if (!text) {
        throw new Error("Nothing to read aloud.");
      }
      const model = isObjectPayload ? String(payload?.model || "").trim() : "";
      return apiClient.aiVoiceTts({
        text,
        model: model || undefined,
      });
    },
    onSuccess: async (data) => {
      await cleanupSound();
      const base64Audio = String(data?.audioBase64 || "").trim();
      const relativeUrl = String(data?.url || "").trim();
      const absoluteUrl = apiClient.resolveAssetUrl(relativeUrl);
      let playbackUri = "";

      if (base64Audio) {
        if (isWeb) {
          try {
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i += 1) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "audio/wav" });
            playbackUri = URL.createObjectURL(blob);
            tempAudioUrlRef.current = playbackUri;
          } catch {
            onWarn?.("Unable to prepare web audio preview.");
          }
        } else {
          const tempFile = `${FileSystem.cacheDirectory || ""}medilink-ai-tts-${Date.now()}.wav`;
          if (!tempFile) {
            onError?.("Unable to prepare local audio cache for playback.");
            return;
          }
          await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
            encoding: BASE64_ENCODING,
          });
          tempAudioPathRef.current = tempFile;
          playbackUri = tempFile;
        }
      } else if (absoluteUrl) {
        playbackUri = absoluteUrl;
      }

      if (!playbackUri) {
        onError?.("Speech generated but no playable audio was returned.");
        return;
      }
      setLastAudioUrl(playbackUri);
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: playbackUri },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 400,
          },
          (status) => {
            if (!status?.isLoaded || status?.didJustFinish) {
              setIsPlaying(false);
            }
          },
        );
        soundRef.current = sound;
        setIsPlaying(true);
        onSuccess?.("Speech is playing.");
      } catch {
        onWarn?.("Speech generated but auto-play failed on this device.");
      }
    },
    onError: (error) => {
      setIsPlaying(false);
      onError?.(error?.message || "Speech generation failed.");
    },
  });

  const speak = useCallback(
    (input, options = {}) => {
      const text = normalizeSpeechText(input);
      if (!text) {
        onWarn?.("Nothing to read aloud.");
        return false;
      }

      const model = String(options?.model || "").trim();
      const forceServer = Boolean(options?.forceServer);
      const language = String(options?.language || defaultLanguage || "en").trim() || "en";

      if (preferDeviceSpeech && !forceServer) {
        cleanupSound()
          .then(() => {
            setLastAudioUrl("");
            setIsPlaying(true);
            Speech.speak(text, {
              language,
              pitch: 1.0,
              rate: 1.0,
              onDone: () => setIsPlaying(false),
              onStopped: () => setIsPlaying(false),
              onError: () => {
                setIsPlaying(false);
                onWarn?.("Device speech failed, falling back to AI voice.");
                ttsMutation.mutate({ text, model: model || undefined });
              },
            });
            onSuccess?.("Speech is playing.");
          })
          .catch(() => {
            ttsMutation.mutate({ text, model: model || undefined });
          });
        return true;
      }

      ttsMutation.mutate({ text, model: model || undefined });
      return true;
    },
    [cleanupSound, onSuccess, onWarn, preferDeviceSpeech, ttsMutation],
  );

  const stop = useCallback(async () => {
    await cleanupSound();
  }, [cleanupSound]);

  return {
    speak,
    stop,
    isSpeaking: Boolean(ttsMutation.isPending || ttsMutation.isLoading || isPlaying),
    lastAudioUrl,
  };
}
