import React from "react";
import { View, Text, Image } from "react-native";
import { resolveMediaUrl } from "@/utils/media";

const getInitials = (user) => {
  if (!user) return "U";
  const name =
    user.fullName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.name ||
    user.email ||
    "";
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export default function UserAvatar({
  user,
  size = 44,
  backgroundColor = "rgba(0,0,0,0.08)",
  textColor = "#667085",
  borderColor = "transparent",
  borderWidth = 1,
  textStyle = {},
  showStatus = false,
  isOnline = false,
}) {
  const avatar =
    user?.profilePhoto ||
    user?.profilePhotoUrl ||
    user?.avatarUrl ||
    user?.photoUrl ||
    user?.imageUrl ||
    user?.image ||
    user?.photo ||
    user?.logoUrl ||
    user?.logo ||
    null;
  const uri = resolveMediaUrl(avatar);
  const radius = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth,
        borderColor,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text
          style={{
            fontSize: Math.max(12, Math.round(size / 2.6)),
            color: textColor,
            fontFamily: "Inter_600SemiBold",
            ...textStyle,
          }}
        >
          {getInitials(user)}
        </Text>
      )}
      {showStatus && isOnline ? (
        <View
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: Math.max(10, Math.round(size / 4.2)),
            height: Math.max(10, Math.round(size / 4.2)),
            borderRadius: 999,
            backgroundColor: "#22C55E",
            borderWidth: 2,
            borderColor: "#FFFFFF",
          }}
        />
      ) : null}
    </View>
  );
}
