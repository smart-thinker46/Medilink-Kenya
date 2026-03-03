import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, Platform, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView as BaseMotiView } from "moti";
import { useAppTheme } from "./ThemeProvider";

const MotiView =
  Platform.OS === "android"
    ? ({ from, animate, transition, exit, children, ...rest }) => (
        <View {...rest}>{children}</View>
      )
    : BaseMotiView;

const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "large",
  loading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  style,
  textStyle,
  ...props
}) => {
  const { theme } = useAppTheme();

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
          fontSize: 14,
        };
      case "medium":
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 10,
          fontSize: 15,
        };
      case "large":
      default:
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
          fontSize: 16,
        };
    }
  };

  const getVariantStyles = () => {
    const sizeStyles = getSizeStyles();

    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.primary,
          textColor: "#FFFFFF",
          useGradient: true,
          gradientColors: theme.gradient.primary,
        };
      case "secondary":
        return {
          backgroundColor: theme.surface,
          textColor: theme.text,
          borderWidth: 1,
          borderColor: theme.border,
          useGradient: false,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          textColor: theme.primary,
          borderWidth: 1,
          borderColor: theme.primary,
          useGradient: false,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          textColor: theme.primary,
          useGradient: false,
        };
      case "danger":
        return {
          backgroundColor: theme.error,
          textColor: "#FFFFFF",
          useGradient: false,
        };
      case "success":
        return {
          backgroundColor: theme.success,
          textColor: "#FFFFFF",
          useGradient: false,
        };
      default:
        return {
          backgroundColor: theme.primary,
          textColor: "#FFFFFF",
          useGradient: true,
          gradientColors: theme.gradient.primary,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const isDisabled = disabled || loading;

  const buttonContent = (
    <TouchableOpacity
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: sizeStyles.borderRadius,
          opacity: isDisabled ? 0.6 : 1,
          ...variantStyles,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          color={variantStyles.textColor}
          size="small"
          style={{ marginRight: title ? 8 : 0 }}
        />
      )}

      {LeftIcon && !loading && (
        <LeftIcon
          color={variantStyles.textColor}
          size={20}
          style={{ marginRight: title ? 8 : 0 }}
        />
      )}

      {title && (
        <Text
          style={[
            {
              fontSize: sizeStyles.fontSize,
              fontFamily: "Inter_600SemiBold",
              color: variantStyles.textColor,
              textAlign: "center",
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}

      {RightIcon && !loading && (
        <RightIcon
          color={variantStyles.textColor}
          size={20}
          style={{ marginLeft: title ? 8 : 0 }}
        />
      )}
    </TouchableOpacity>
  );

  if (variantStyles.useGradient) {
    return (
      <MotiView
        animate={{
          scale: isDisabled ? 0.98 : 1,
        }}
        transition={{
          type: "timing",
          duration: 200,
        }}
        style={[
          {
            borderRadius: sizeStyles.borderRadius,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDisabled ? 0 : 0.3,
            shadowRadius: 8,
            elevation: isDisabled ? 0 : 4,
          },
          style,
        ]}
      >
        <LinearGradient
          colors={variantStyles.gradientColors}
          style={{
            borderRadius: sizeStyles.borderRadius,
          }}
        >
          {buttonContent}
        </LinearGradient>
      </MotiView>
    );
  }

  return (
    <MotiView
      animate={{
        scale: isDisabled ? 0.98 : 1,
      }}
      transition={{
        type: "timing",
        duration: 200,
      }}
    >
      {buttonContent}
    </MotiView>
  );
};

export default Button;
