import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import {
  ArrowLeft,
  FileText,
  Download,
  Share,
  Pill,
  Activity,
  Eye,
  Search,
  Filter,
  Sparkles,
} from "lucide-react-native";
import { Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import { useI18n } from "@/utils/i18n";

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();
  const { formatDate: formatLocaleDate } = useI18n();
  const patientId = auth?.user?.id;

  const validTabs = ["all", "prescriptions", "conditions", "notes"];
  const initialTab =
    typeof params?.tab === "string" && validTabs.includes(params.tab)
      ? params.tab
      : "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiSummary, setAiSummary] = useState(null);

  const tabs = [
    { id: "all", title: "All Records", icon: FileText },
    { id: "prescriptions", title: "Prescriptions", icon: Pill },
    { id: "conditions", title: "Conditions", icon: Activity },
    { id: "notes", title: "Notes", icon: Eye },
  ];

  const recordsQuery = useQuery({
    queryKey: ["medical-records", patientId],
    queryFn: () => apiClient.getMedicalRecords(patientId),
    enabled: Boolean(patientId),
  });
  const aiSummaryMutation = useMutation({
    mutationFn: () => apiClient.aiHealthSummary({ patientId }),
    onSuccess: (data) => setAiSummary(data || null),
    onError: (error) => {
      showToast(error.message || "AI summary unavailable.", "error");
    },
  });

  const medicalRecords = useMemo(() => {
    const records = recordsQuery.data || [];
      return records.map((record) => ({
        id: record.id,
        type: record.type || "note",
        title:
          record.type === "prescription"
            ? "Prescription"
            : record.type === "condition"
              ? "Condition Update"
              : record.type === "clinical_update"
                ? "Clinical Update"
              : "Medical Note",
        doctorName: record.medic?.fullName || "Medic",
        date: record.createdAt,
        hospital: "Medilink",
        description: record.notes || record.condition || "Update from medic.",
        medications:
          record.type === "prescription" && record.notes
            ? record.notes.split(",").map((item) => item.trim())
            : record.type === "clinical_update" && record.notes
              ? (record.notes
                  .split("\n")
                  .find((line) =>
                    String(line).toLowerCase().startsWith("prescribed medicines:"),
                  )
                  ?.replace(/prescribed medicines:/i, "")
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean) || null)
            : null,
      attachments: Array.isArray(record.attachments)
        ? record.attachments.filter((file) => file?.url)
        : [],
        status: "active",
      }));
  }, [recordsQuery.data]);

  const filteredRecords =
    activeTab === "all"
      ? medicalRecords
      : medicalRecords.filter((record) => {
          if (activeTab === "prescriptions") return record.type === "prescription";
          if (activeTab === "conditions") return record.type === "condition";
          if (activeTab === "notes") return ["note", "clinical_update"].includes(record.type);
          return record.type === activeTab;
        });

  const getTypeColor = (type) => {
    switch (type) {
      case "prescription":
        return theme.accent;
      case "condition":
        return theme.success;
      case "note":
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "prescription":
        return Pill;
      case "condition":
        return Activity;
      case "note":
        return Eye;
      case "clinical_update":
        return Activity;
      default:
        return FileText;
    }
  };

  const getAttachmentType = (file) => {
    const name = (file?.name || file?.url || "").toLowerCase();
    if (name.match(/\.(png|jpe?g|gif|webp|bmp)$/)) return "image";
    if (name.endsWith(".pdf")) return "pdf";
    return "file";
  };

  const buildUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.EXPO_PUBLIC_BASE_URL || ""}${url}`;
  };

  const formatDate = (dateString) => formatLocaleDate(dateString);

  const renderRecordCard = ({ item, index }) => {
    const TypeIcon = getTypeIcon(item.type);
    const typeColor = getTypeColor(item.type);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "timing",
          duration: 600,
          delay: index * 100,
        }}
        style={{ marginBottom: 16 }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.8}
          onPress={() =>
            router.push(`/(app)/(patient)/medical-record/${item.id}`)
          }
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${typeColor}15`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <TypeIcon color={typeColor} size={24} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Nunito_600SemiBold",
                    color: theme.text,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  {item.doctorName} • {item.hospital}
                </Text>

                <View
                  style={{
                    backgroundColor: `${typeColor}20`,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_500Medium",
                      color: typeColor,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.type.replace("_", " ")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                  marginBottom: 8,
                }}
              >
                {formatDate(item.date)}
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Share color={theme.iconColor} size={14} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Download color={theme.iconColor} size={14} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: theme.text,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            {item.description}
          </Text>

          {/* Key Information */}
          {item.medications && (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Medications
              </Text>
              {item.medications.map((med, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.text,
                    marginBottom: 4,
                  }}
                >
                  • {med}
                </Text>
              ))}
            </View>
          )}

          {item.type === "prescription" ? (
            <TouchableOpacity
              style={{
                marginTop: 10,
                backgroundColor: `${theme.primary}15`,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: `${theme.primary}40`,
                paddingVertical: 10,
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "/(app)/(patient)/pharmacy",
                  params: { prescriptionId: item.id },
                })
              }
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.primary,
                }}
              >
                Use Prescription in Pharmacy
              </Text>
            </TouchableOpacity>
          ) : null}

          {item.results && (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Key Results
              </Text>
              {Object.entries(item.results)
                .slice(0, 2)
                .map(([key, value]) => (
                  <View
                    key={key}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                        flex: 1,
                      }}
                    >
                      {key}:
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: theme.text,
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {item.vitals && (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Vitals
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {Object.entries(item.vitals)
                  .slice(0, 2)
                  .map(([key, value]) => (
                    <View
                      key={key}
                      style={{
                        backgroundColor: theme.surface,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: theme.textSecondary,
                          marginBottom: 2,
                        }}
                      >
                        {key}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_600SemiBold",
                          color: theme.text,
                        }}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Attachments */}
          {item.attachments && item.attachments.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <FileText color={theme.iconColor} size={16} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginLeft: 8,
                  marginRight: 12,
                }}
              >
                {item.attachments.length} attachment
                {item.attachments.length > 1 ? "s" : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {item.attachments.slice(0, 3).map((file, index) => {
                  const type = getAttachmentType(file);
                  if (type === "image") {
                    return (
                      <Image
                        key={`${file.url}-${index}`}
                        source={{ uri: buildUrl(file.url) }}
                        style={{ width: 32, height: 32, borderRadius: 6 }}
                      />
                    );
                  }
                  return (
                    <View
                      key={`${file.url}-${index}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: theme.surface,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText color={theme.iconColor} size={14} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <ScreenLayout>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                fontSize: 24,
                fontFamily: "Nunito_700Bold",
                color: theme.text,
              }}
            >
              Medical Records
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Search color={theme.iconColor} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Filter color={theme.iconColor} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? theme.primary : theme.surface,
                  borderRadius: 25,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <tab.icon
                  color={activeTab === tab.id ? "#FFFFFF" : theme.textSecondary}
                  size={16}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color:
                      activeTab === tab.id ? "#FFFFFF" : theme.textSecondary,
                    marginLeft: 8,
                  }}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => aiSummaryMutation.mutate()}
            activeOpacity={0.85}
            disabled={aiSummaryMutation.isLoading}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: `${theme.primary}20`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Sparkles color={theme.primary} size={16} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                {aiSummaryMutation.isLoading
                  ? "Generating AI health summary..."
                  : "Generate AI Health Summary"}
              </Text>
            </View>
          </TouchableOpacity>
          {!!aiSummary?.summary && (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                marginTop: 10,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_700Bold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                AI Summary
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                {aiSummary.summary}
              </Text>
              {Array.isArray(aiSummary.highlights) &&
                aiSummary.highlights.slice(0, 4).map((item, index) => (
                  <Text key={`hl-${index}`} style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    • {item}
                  </Text>
                ))}
            </View>
          )}
        </View>

        {/* Records List */}
        {recordsQuery.isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            renderItem={renderRecordCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "timing", duration: 600 }}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 60,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: theme.surface,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <FileText color={theme.iconColor} size={32} />
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Nunito_600SemiBold",
                    color: theme.text,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  No medical records
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: theme.textSecondary,
                    textAlign: "center",
                    lineHeight: 20,
                    paddingHorizontal: 40,
                  }}
                >
                  {recordsQuery.isError
                    ? "Unable to load records right now."
                    : "Your medical records will appear here after appointments"}
                </Text>
              </MotiView>
            )}
          />
        )}
      </View>
    </ScreenLayout>
  );
}
