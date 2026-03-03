import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { MoreHorizontal, X, Circle } from "lucide-react-native";

export default function WebTabBar({
  theme,
  primaryLinks = [],
  moreLinks = [],
  badgeCount = 0,
  badgeCounts = {},
  maxVisibleLinks = 5,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const slide = useMemo(() => new Animated.Value(0), []);

  const openDrawer = () => {
    setOpen(true);
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const width = Math.min(360, Dimensions.get("window").width * 0.8);
  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  const renderLink = (link) => {
    const isRootTab = link.key === "home" || link.key === "overview";
    const active =
      pathname === link.href ||
      (!isRootTab && pathname.startsWith(`${link.href}/`));
    const Icon = link.icon || Circle;
    const count = Number.isFinite(link.badgeCount)
      ? link.badgeCount
      : badgeCounts[link.key] || 0;
    return (
      <TouchableOpacity
        key={link.key}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
        }}
        onPress={() => router.push(link.href)}
        activeOpacity={0.8}
      >
        <View style={{ position: "relative" }}>
          <Icon color={active ? theme.primary : theme.iconColor} size={20} />
          {count > 0 && (
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -10,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: theme.error,
                paddingHorizontal: 4,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {count > 99 ? "99+" : count}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_500Medium",
            marginTop: 4,
            color: active ? theme.primary : theme.textSecondary,
          }}
        >
          {link.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const maxPrimary = Math.max(
    0,
    maxVisibleLinks - (moreLinks.length > 0 ? 1 : 0)
  );
  const visiblePrimaryLinks = primaryLinks.slice(0, maxPrimary);
  const overflowLinks = [...primaryLinks.slice(maxPrimary), ...moreLinks];

  return (
    <>
      <View
        style={{
          backgroundColor: theme.bottomArea,
          borderTopWidth: 1,
          borderTopColor: theme.bottomBorder,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {visiblePrimaryLinks.map(renderLink)}
        {overflowLinks.length > 0 && (
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
            }}
            onPress={openDrawer}
            activeOpacity={0.8}
          >
            <View style={{ position: "relative" }}>
              <MoreHorizontal color={theme.iconColor} size={20} />
              {badgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: theme.error,
                    paddingHorizontal: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                marginTop: 4,
                color: theme.textSecondary,
              }}
            >
              More
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal transparent visible={open} animationType="none">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={closeDrawer}
        />
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width,
            backgroundColor: theme.card,
            paddingTop: insets.top + 24,
            paddingHorizontal: 20,
            transform: [{ translateX }],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
              }}
            >
              More
            </Text>
            <TouchableOpacity onPress={closeDrawer} activeOpacity={0.8}>
              <X color={theme.iconColor} size={20} />
            </TouchableOpacity>
          </View>

            {overflowLinks.length === 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                No additional links.
              </Text>
            ) : (
              overflowLinks.map((link) => {
                const Icon = link.icon || Circle;
                const count = Number.isFinite(link.badgeCount)
                  ? link.badgeCount
                  : badgeCounts[link.key] || 0;
                return (
                  <TouchableOpacity
                    key={link.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                    onPress={() => {
                      closeDrawer();
                      router.push(link.href);
                    }}
                  >
                    <Icon color={theme.iconColor} size={18} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: theme.text,
                        marginLeft: 12,
                        flex: 1,
                      }}
                    >
                      {link.title}
                    </Text>
                    {count > 0 && (
                      <View
                        style={{
                          minWidth: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: theme.error,
                          paddingHorizontal: 6,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontFamily: "Inter_700Bold",
                          }}
                        >
                          {count > 99 ? "99+" : count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
        </Animated.View>
      </Modal>
    </>
  );
}
