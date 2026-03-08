import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";

import apiClient from "@/utils/api";

const normalizeSpeechText = (value, maxChars = 1800) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.slice(0, maxChars);
};

export default function useAiSpeechPlayer({
  preferDeviceSpeech = true,
  onWarn,
  onError,
  onSuccess,
} = {}) {
  const soundRef = useRef(null);
  const tempAudioPathRef = useRef("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState("");

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
      await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupSound().catch(() => undefined);
    };
  }, [cleanupSound]);

  const ttsMutation = useMutation({
    mutationFn: (text) => apiClient.aiVoiceTts({ text }),
    onSuccess: async (data) => {
      await cleanupSound();
      const base64Audio = String(data?.audioBase64 || "").trim();
      const relativeUrl = String(data?.url || "").trim();
      const absoluteUrl = apiClient.resolveAssetUrl(relativeUrl);
      let playbackUri = "";

      if (base64Audio) {
        const tempFile = `${FileSystem.cacheDirectory || ""}medilink-ai-tts-${Date.now()}.wav`;
        if (!tempFile) {
          onError?.("Unable to prepare local audio cache for playback.");
          return;
        }
        await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
          encoding: FileSystem.EncodingType.Base64,
        });
        tempAudioPathRef.current = tempFile;
        playbackUri = tempFile;
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
    (input) => {
      const text = normalizeSpeechText(input);
      if (!text) {
        onWarn?.("Nothing to read aloud.");
        return false;
      }

      if (preferDeviceSpeech) {
        cleanupSound()
          .then(() => {
            setLastAudioUrl("");
            setIsPlaying(true);
            Speech.speak(text, {
              language: "en",
              pitch: 1.0,
              rate: 1.0,
              onDone: () => setIsPlaying(false),
              onStopped: () => setIsPlaying(false),
              onError: () => {
                setIsPlaying(false);
                onWarn?.("Device speech failed, falling back to AI voice.");
                ttsMutation.mutate(text);
              },
            });
            onSuccess?.("Speech is playing.");
          })
          .catch(() => {
            ttsMutation.mutate(text);
          });
        return true;
      }

      ttsMutation.mutate(text);
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
