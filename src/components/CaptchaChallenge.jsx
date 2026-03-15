import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
} from "react-native";
import { RefreshCcw, ShieldCheck } from "lucide-react-native";
import { useAppTheme } from "./ThemeProvider";
import apiClient from "@/utils/api";

const DEFAULT_ANSWER = "verified";

const IMAGE_CHOICES = {
  cat: { label: "Cat", emoji: "🐱", color: "#FCD34D" },
  dog: { label: "Dog", emoji: "🐶", color: "#FDBA74" },
  car: { label: "Car", emoji: "🚗", color: "#93C5FD" },
  tree: { label: "Tree", emoji: "🌳", color: "#86EFAC" },
  heart: { label: "Heart", emoji: "❤️", color: "#FDA4AF" },
  pill: { label: "Pill", emoji: "💊", color: "#BFDBFE" },
  hospital: { label: "Hospital", emoji: "🏥", color: "#FCA5A5" },
  stethoscope: { label: "Stethoscope", emoji: "🩺", color: "#A7F3D0" },
};


const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatExpires = (expiresAt) => {
  if (!expiresAt) return "";
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString();
};

export default function CaptchaChallenge({
  onVerified,
  preferredType,
  title = "Security Check",
  helperText = "Complete the challenge to continue.",
  style,
}) {
  const { theme } = useAppTheme();
  const onVerifiedRef = useRef(onVerified);
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("loading");
  const [trackWidth, setTrackWidth] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const knobX = useRef(new Animated.Value(0)).current;
  const sliderLocked = useRef(false);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const resetSlider = useCallback(() => {
    sliderLocked.current = false;
    Animated.timing(knobX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [knobX]);

  const loadChallenge = useCallback(async () => {
    setStatus("loading");
    setError("");
    setAnswer("");
    setSelectedOption("");
    onVerifiedRef.current?.("");
    resetSlider();
    try {
      const data = await apiClient.captchaGenerate(
        preferredType ? { type: preferredType } : {},
      );
      setChallenge(data);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Failed to load verification challenge.");
    }
  }, [preferredType, resetSlider]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const verifyAnswer = async (value) => {
    if (!challenge?.id || !value) return;
    setStatus("verifying");
    setError("");
    try {
      const response = await apiClient.captchaVerify(challenge.id, value);
      setStatus("verified");
      onVerifiedRef.current?.(response?.token || "");
    } catch (err) {
      setStatus("ready");
      setError(err?.message || "Verification failed. Try again.");
      onVerifiedRef.current?.("");
      resetSlider();
    }
  };

  const handleVerifyPress = () => {
    if (!answer.trim()) {
      setError("Answer is required.");
      return;
    }
    verifyAnswer(answer.trim().toLowerCase());
  };

  const maxSlide = Math.max(0, trackWidth - 48);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => status === "ready" && !sliderLocked.current,
        onMoveShouldSetPanResponder: () => status === "ready" && !sliderLocked.current,
        onPanResponderMove: (_, gestureState) => {
          if (sliderLocked.current) return;
          const next = clamp(gestureState.dx, 0, maxSlide);
          knobX.setValue(next);
        },
        onPanResponderRelease: () => {
          if (sliderLocked.current) return;
          const current = knobX.__getValue?.() ?? 0;
          if (current >= maxSlide * 0.9) {
            sliderLocked.current = true;
            Animated.timing(knobX, {
              toValue: maxSlide,
              duration: 120,
              useNativeDriver: false,
            }).start(() => verifyAnswer(DEFAULT_ANSWER));
            return;
          }
          resetSlider();
        },
      }),
    [knobX, maxSlide, resetSlider, status],
  );

  const isVerified = status === "verified";
  const isMath = challenge?.type === "math";
  const isSlider = challenge?.type === "slider";
  const isImage = challenge?.type === "image";
  const imageOptions = Array.isArray(challenge?.options) ? challenge.options : [];

  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: 16,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ShieldCheck color={theme.primary} size={18} />
          <Text style={{ marginLeft: 8, fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={loadChallenge} disabled={status === "loading"}>
          <RefreshCcw color={theme.textSecondary} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
        {helperText}
      </Text>

      {challenge?.question ? (
        <Text style={{ marginTop: 10, fontSize: 13, color: theme.text, fontFamily: "Inter_500Medium" }}>
          {challenge.question}
        </Text>
      ) : null}

      {challenge?.expiresAt ? (
        <Text style={{ marginTop: 6, fontSize: 11, color: theme.textTertiary }}>
          Expires at {formatExpires(challenge.expiresAt)}
        </Text>
      ) : null}

      {isMath && (
        <View style={{ marginTop: 12 }}>
          <TextInput
            placeholder="Type answer"
            placeholderTextColor={theme.textSecondary}
            value={answer}
            onChangeText={(value) => {
              setAnswer(value);
              if (error) setError("");
            }}
            keyboardType="numeric"
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 12,
              color: theme.text,
              backgroundColor: theme.surface,
            }}
          />
          <TouchableOpacity
            onPress={handleVerifyPress}
            disabled={status !== "ready"}
            style={{
              marginTop: 10,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: theme.primary,
              opacity: status !== "ready" ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {status === "verifying" ? "Verifying..." : isVerified ? "Verified" : "Verify"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isSlider && (
        <View style={{ marginTop: 14 }}>
          <View
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            style={{
              height: 44,
              borderRadius: 999,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                position: "absolute",
                alignSelf: "center",
                fontSize: 12,
                color: theme.textSecondary,
              }}
            >
              {isVerified ? "Verified" : "Drag to verify"}
            </Text>
            <Animated.View
              {...panResponder.panHandlers}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.primary,
                transform: [{ translateX: knobX }],
                opacity: status === "verifying" ? 0.7 : 1,
              }}
            />
          </View>
        </View>
      )}

      {isImage && (
        <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {imageOptions.map((key) => {
            const item = IMAGE_CHOICES[key] || {
              label: "Image",
              emoji: "❓",
              color: "#E5E7EB",
            };
            const isActive = selectedOption === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  if (status !== "ready") return;
                  setSelectedOption(key);
                  verifyAnswer(key);
                }}
                disabled={status !== "ready"}
                style={{
                  width: "48%",
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: theme.surface,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: item.color || theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 40 }}>{item.emoji || "❓"}</Text>
                </View>
                <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {status === "loading" && (
        <Text style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>
          Loading verification...
        </Text>
      )}

      {error ? (
        <Text style={{ marginTop: 10, fontSize: 12, color: theme.error }}>
          {error}
        </Text>
      ) : null}

      {isVerified && (
        <Text style={{ marginTop: 10, fontSize: 12, color: theme.success }}>
          Challenge verified. You can continue.
        </Text>
      )}
    </View>
  );
}
