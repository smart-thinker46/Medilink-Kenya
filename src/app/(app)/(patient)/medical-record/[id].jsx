import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Image,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Pill, Activity, Eye, FileText, X, FileImage, FileText as FilePdf } from "lucide-react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";

const typeMeta = {
  prescription: { label: "Prescription", icon: Pill },
  condition: { label: "Condition Update", icon: Activity },
  clinical_update: { label: "Clinical Update", icon: Activity },
  note: { label: "Medical Note", icon: FileText },
};

export default function MedicalRecordDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams();
  const recordId = params?.id;

  const recordQuery = useQuery({
    queryKey: ["medical-record", recordId],
    queryFn: () => apiClient.getMedicalRecordById(recordId),
    enabled: Boolean(recordId),
  });

  const record = recordQuery.data;
  const meta = typeMeta[record?.type] || { label: "Record", icon: Eye };
  const Icon = meta.icon;
  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  const imageAttachments = useMemo(
    () =>
      attachments
        .map((file) => ({
          ...file,
          type: file?.name?.toLowerCase().match(/\.(png|jpe?g|gif|webp|bmp)$/)
            ? "image"
            : file?.name?.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : "file",
        }))
        .filter((file) => file.type === "image"),
    [attachments],
  );
  const [preview, setPreview] = useState(null);
  const scrollRef = useRef(null);
  const { width: screenWidth } = Dimensions.get("window");

  useEffect(() => {
    if (preview?.type === "image" && scrollRef.current) {
      const index = preview?.index || 0;
      requestAnimationFrame(() => {
        scrollRef.current.scrollTo({ x: index * screenWidth, animated: false });
      });
    }
  }, [preview, screenWidth]);

  const buildUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.EXPO_PUBLIC_BASE_URL || ""}${url}`;
  };

  const getFileType = (file) => {
    const name = (file?.name || file?.url || "").toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.match(/\.(png|jpe?g|gif|webp|bmp)$/)) return "image";
    return "file";
  };

  const getFileIcon = (file) => {
    const type = getFileType(file);
    if (type === "image") return FileImage;
    if (type === "pdf") return FilePdf;
    return FileText;
  };

  const downloadAttachment = async (file) => {
    if (!file?.url) return;
    const fullUrl = buildUrl(file.url);
    try {
      if (Platform.OS === "web") {
        await Linking.openURL(fullUrl);
        return;
      }
      const fileName = file.name || `attachment-${Date.now()}`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(fullUrl, localUri);
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await Linking.openURL(contentUri);
      } else {
        await Linking.openURL(uri);
      }
    } catch (error) {
      Alert.alert("Download failed", "Unable to save attachment.");
    }
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 22,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Medical Record
          </Text>
        </View>

        {recordQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !record ? (
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_500Medium",
                color: theme.textSecondary,
              }}
            >
              Unable to load record details.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Icon color={theme.primary} size={26} />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 6,
                }}
              >
                {meta.label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 12,
                }}
              >
                {record.medic?.fullName || "Medic"} •{" "}
                {new Date(record.createdAt).toLocaleDateString()}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.text,
                  lineHeight: 20,
                }}
              >
                {record.notes || record.condition || "No additional notes."}
              </Text>

              {attachments.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.textSecondary,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Attachments
                  </Text>
                  {attachments.map((file, index) => {
                    const Icon = getFileIcon(file);
                    return (
                    <View
                      key={`${file.url || "file"}-${index}`}
                      style={{
                        paddingVertical: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (!file.url) return;
                        const type = getFileType(file);
                        const fullUrl = buildUrl(file.url);
                        if (type === "file") {
                          Linking.openURL(fullUrl);
                        } else {
                          if (type === "image") {
                            const startIndex = imageAttachments.findIndex(
                              (item) => item.url === file.url,
                            );
                            setPreview({
                              type: "image",
                              index: startIndex >= 0 ? startIndex : 0,
                              items: imageAttachments.map((item) => ({
                                url: buildUrl(item.url),
                                name: item.name || "Image",
                              })),
                            });
                          } else {
                            setPreview({ url: fullUrl, type, name: file.name || "Attachment" });
                          }
                        }
                        }}
                        style={{ flex: 1, marginRight: 12 }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Icon color={theme.primary} size={16} />
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Inter_500Medium",
                              color: theme.primary,
                              marginLeft: 8,
                            }}
                          >
                            {file.name || file.url}
                          </Text>
                          {file.size ? (
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: "Inter_400Regular",
                                color: theme.textSecondary,
                                marginLeft: 8,
                              }}
                            >
                              {(file.size / 1024).toFixed(1)} KB
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => downloadAttachment(file)}
                        style={{
                          backgroundColor: theme.surface,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Inter_600SemiBold",
                            color: theme.textSecondary,
                          }}
                        >
                          Download
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal visible={Boolean(preview)} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View
            style={{
              paddingTop: insets.top + 12,
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>
              {preview?.name}
            </Text>
            <TouchableOpacity onPress={() => setPreview(null)}>
              <X color="#FFFFFF" size={22} />
            </TouchableOpacity>
          </View>
          {preview?.type === "image" ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              ref={scrollRef}
            >
              {preview?.items?.map((item, index) => (
                <View
                  key={`${item.url}-${index}`}
                  style={{
                    width: screenWidth,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <WebView source={{ uri: preview?.url }} style={{ flex: 1 }} />
          )}
        </View>
      </Modal>
    </ScreenLayout>
  );
}
