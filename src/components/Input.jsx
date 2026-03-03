import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MotiView } from "moti";
import { Eye, EyeOff } from "lucide-react-native";
import { useAppTheme } from "./ThemeProvider";

const Input = forwardRef(
  (
    {
      label,
      error,
      placeholder,
      secureTextEntry,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      required,
      ...props
    },
    ref,
  ) => {
    const { theme } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    const handleFocus = () => {
      setIsFocused(true);
      props.onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      props.onBlur?.();
    };

    const toggleSecureEntry = () => {
      setIsSecure(!isSecure);
    };

    const borderColor = error
      ? theme.error
      : isFocused
        ? theme.primary
        : theme.borderInput;

    return (
      <View style={[{ marginBottom: 16 }, containerStyle]}>
        {label && (
          <Text
            style={[
              {
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              },
              labelStyle,
            ]}
          >
            {label}
            {required && <Text style={{ color: theme.error }}> *</Text>}
          </Text>
        )}

        <MotiView
          animate={{
            borderColor,
            shadowColor: isFocused ? theme.primary : "transparent",
          }}
          transition={{
            type: "timing",
            duration: 200,
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderRadius: 12,
            backgroundColor: theme.inputBackground,
            paddingHorizontal: 16,
            minHeight: 52,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isFocused ? 0.1 : 0,
            shadowRadius: 4,
            elevation: isFocused ? 2 : 0,
          }}
        >
          {LeftIcon && (
            <View style={{ marginRight: 12 }}>
              <LeftIcon
                color={isFocused ? theme.primary : theme.iconColor}
                size={20}
              />
            </View>
          )}

          <TextInput
            ref={ref}
            style={[
              {
                flex: 1,
                fontSize: 16,
                fontFamily: "Inter_400Regular",
                color: theme.text,
                paddingVertical: 0,
              },
              inputStyle,
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry={isSecure}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor={theme.primary}
            {...props}
          />

          {secureTextEntry && (
            <TouchableOpacity
              onPress={toggleSecureEntry}
              style={{
                marginLeft: 12,
                padding: 4,
              }}
              activeOpacity={0.7}
            >
              {isSecure ? (
                <EyeOff color={theme.iconColor} size={20} />
              ) : (
                <Eye color={theme.iconColor} size={20} />
              )}
            </TouchableOpacity>
          )}

          {RightIcon && !secureTextEntry && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={{
                marginLeft: 12,
                padding: 4,
              }}
              activeOpacity={0.7}
            >
              <RightIcon
                color={isFocused ? theme.primary : theme.iconColor}
                size={20}
              />
            </TouchableOpacity>
          )}
        </MotiView>

        {error && (
          <MotiView
            from={{ opacity: 0, translateY: -5 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 200 }}
            style={{ marginTop: 6 }}
          >
            <Text
              style={[
                {
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.error,
                },
                errorStyle,
              ]}
            >
              {error}
            </Text>
          </MotiView>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";

export default Input;
