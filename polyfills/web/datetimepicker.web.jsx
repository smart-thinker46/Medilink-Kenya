import React from "react";
import { TextInput, View } from "react-native";

export default function DateTimePickerWeb({
  value,
  onChange,
  mode = "date",
  style,
}) {
  const formatted =
    value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString().slice(0, 10)
      : "";

  const handleChange = (text) => {
    if (!onChange) return;
    if (!text) {
      onChange({}, undefined);
      return;
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      onChange({}, undefined);
      return;
    }
    onChange({ nativeEvent: { text } }, parsed);
  };

  return (
    <View style={style}>
      <TextInput
        value={formatted}
        onChangeText={handleChange}
        placeholder={mode === "date" ? "YYYY-MM-DD" : "Select date"}
        style={{
          height: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.15)",
          paddingHorizontal: 10,
          fontSize: 12,
        }}
      />
    </View>
  );
}
