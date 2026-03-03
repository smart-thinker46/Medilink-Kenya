import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Clock3 } from "lucide-react-native";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function SubscriptionCountdownBanner({
  createdAt,
  subscriptionActive,
  theme,
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = useMemo(() => {
    if (subscriptionActive) return null;
    if (!createdAt) return null;

    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return null;

    const elapsedMs = Math.max(0, now - created.getTime());
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);
    const daysLeft = Math.min(30, Math.max(0, 30 - elapsedDays));

    return { daysLeft };
  }, [createdAt, now, subscriptionActive]);

  if (!countdown) return null;

  const { daysLeft } = countdown;
  const statusColor = daysLeft >= 20 ? theme.success : daysLeft >= 10 ? theme.warning : theme.error;

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: `${statusColor}15`,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${statusColor}40`,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Clock3 color={statusColor} size={18} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: theme.text,
            }}
          >
            Subscription trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: statusColor,
              marginTop: 2,
            }}
          >
            {daysLeft === 0 ? "Trial ended. Upgrade to continue full access." : "Upgrade before trial ends to avoid access limits."}
          </Text>
        </View>
      </View>
    </View>
  );
}
