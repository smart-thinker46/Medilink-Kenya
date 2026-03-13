import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Crown,
  Search,
  Sparkles,
  PackageSearch,
  BarChart3,
  MessageCircle,
  Volume2,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/utils/auth/store";
import apiClient from "@/utils/api";
import usePharmacyScope from "@/utils/usePharmacyScope";
import PharmacyScopeSelector from "@/components/PharmacyScopeSelector";
import useAiSpeechPlayer from "@/utils/useAiSpeechPlayer";

const formatList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .slice(0, 5)
    .map((item) => `- ${String(item)}`)
    .join("\n");

export default function PharmacyAiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { auth } = useAuthStore();

  const {
    isSuperAdmin,
    pharmacyId,
    pharmacies,
    setSelectedPharmacyTenantId,
    isLoadingScope,
  } = usePharmacyScope();
  const [searchQuery, setSearchQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantConversationId, setAssistantConversationId] = useState("default");
  const [analyticsResult, setAnalyticsResult] = useState(null);
  const [stockForecastResult, setStockForecastResult] = useState(null);
  const { speak: speakAiText, stop: stopAiSpeech, isSpeaking: aiSpeaking } = useAiSpeechPlayer({
    onWarn: (message) => showToast(message, "warning"),
    onError: (message) => showToast(message, "error"),
  });

  useEffect(() => {
    return () => {
      stopAiSpeech().catch(() => undefined);
    };
  }, [stopAiSpeech]);

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-settings", "pharmacy-ai-assistant"],
    queryFn: () => apiClient.aiGetSettings(),
    enabled: Boolean(auth?.token || auth?.jwt || auth?.accessToken),
  });

  const productsQuery = useQuery({
    queryKey: ["pharmacy-products", "ai-assistant", pharmacyId],
    queryFn: () => apiClient.getProducts(pharmacyId),
    enabled: Boolean(pharmacyId),
  });

  const ordersQuery = useQuery({
    queryKey: ["pharmacy-orders", "ai-assistant"],
    queryFn: () => apiClient.getOrders(),
  });

  const aiUpdateMutation = useMutation({
    mutationFn: (enabled) => apiClient.aiUpdateSettings({ enabled }),
    onSuccess: () => aiSettingsQuery.refetch(),
    onError: (error) => showToast(error?.message || "Unable to update AI settings.", "error"),
  });

  const aiSearchMutation = useMutation({
    mutationFn: () =>
      apiClient.aiSearch({
        query: searchQuery,
        include: ["pharmacy", "medic", "hospital", "product"],
        limit: 10,
      }),
    onSuccess: (data) => setSearchResults(Array.isArray(data?.results) ? data.results : []),
    onError: (error) => showToast(error?.message || "AI search unavailable.", "error"),
  });

  const aiAssistantMutation = useMutation({
    mutationFn: (query) =>
      apiClient.aiAssistant({
        query,
        conversationId: assistantConversationId || "default",
      }),
    onSuccess: (data) => {
      setAssistantAnswer(String(data?.answer || ""));
      if (data?.conversationId) {
        setAssistantConversationId(String(data.conversationId));
      }
    },
    onError: (error) => showToast(error?.message || "AI assistant unavailable.", "error"),
  });

  const aiAnalyticsMutation = useMutation({
    mutationFn: () =>
      apiClient.aiAnalyticsSummary({
        timeframe: "current pharmacy snapshot",
        context: "pharmacy operations",
      }),
    onSuccess: (data) => setAnalyticsResult(data || null),
    onError: (error) => showToast(error?.message || "AI analytics unavailable.", "error"),
  });

  const aiStockForecastMutation = useMutation({
    mutationFn: () =>
      apiClient.aiStockForecast({
        pharmacyId,
        windowDays: 30,
      }),
    onSuccess: (data) => setStockForecastResult(data || null),
    onError: (error) => showToast(error?.message || "Stock forecast unavailable.", "error"),
  });

  const aiState = aiSettingsQuery.data || {};
  const isPremium = Boolean(aiState?.isPremium);
  const aiEnabled = Boolean(aiState?.aiEnabled);
  const canUse = Boolean(aiState?.canUse);
  const providerLabel = String(aiState?.displayProvider || "Medilink AI");
  const blockedReason = String(aiState?.blockedReason || "");

  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const orders = ordersQuery.data?.items || ordersQuery.data || [];
  const lowStockProducts = useMemo(
    () =>
      products.filter((item) => {
        const stock = Number(item?.stock ?? item?.numberInStock ?? item?.quantity ?? 0);
        const reorderLevel = Number(item?.reorderLevel ?? 5);
        return stock <= reorderLevel;
      }),
    [products],
  );

  const pendingOrders = useMemo(
    () =>
      orders.filter((item) =>
        ["PENDING", "PROCESSING"].includes(String(item?.status || "").toUpperCase()),
      ),
    [orders],
  );

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(pharmacy)");
  };

  const promptEnable = () => {
    if (!isPremium) {
      Alert.alert(
        "Premium Required",
        "AI is a premium feature. Please activate subscription first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Subscribe",
            onPress: () =>
              router.push({
                pathname: "/(app)/(shared)/subscription-checkout",
                params: { role: "PHARMACY_ADMIN" },
              }),
          },
        ],
      );
      return;
    }
    aiUpdateMutation.mutate(true);
  };

  const runPharmacyPrompt = (prompt) => {
    setAssistantQuery(prompt);
    aiAssistantMutation.mutate(prompt);
  };

  const lowStockPrompt = `Generate a clear reorder plan for this pharmacy:
Low stock products:
${formatList(
  lowStockProducts.map(
    (item) =>
      `${item?.name || item?.productName || "Product"} (stock ${
        Number(item?.stock ?? item?.numberInStock ?? item?.quantity ?? 0)
      })`,
  ),
)}
Pending orders count: ${pendingOrders.length}.
Return concise actionable steps.`;

  const demandPrompt = `Based on current pharmacy state, suggest demand and stock actions:
Products count: ${products.length}
Low stock count: ${lowStockProducts.length}
Pending orders: ${pendingOrders.length}
Provide top 5 priority actions for the next 7 days.`;

  const getAnalyticsSpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    return [
      String(data?.summary || "").trim(),
      Array.isArray(data?.insights) && data.insights.length
        ? `Insights: ${data.insights.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.alerts) && data.alerts.length
        ? `Alerts: ${data.alerts.slice(0, 4).join(". ")}`
        : "",
      Array.isArray(data?.recommendations) && data.recommendations.length
        ? `Recommendations: ${data.recommendations.slice(0, 4).join(". ")}`
        : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  const getStockForecastSpeechText = (data) => {
    if (!data) return "";
    if (String(data?.speechText || "").trim()) return String(data.speechText).trim();
    const urgent = Array.isArray(data?.urgent) ? data.urgent : [];
    return [
      String(data?.summary || "").trim(),
      Array.isArray(data?.recommendations) && data.recommendations.length
        ? `Recommendations: ${data.recommendations.slice(0, 3).join(". ")}`
        : "",
      urgent.length ? `Urgent products: ${urgent.slice(0, 3).map((item) => item?.name).filter(Boolean).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity
            onPress={safeBack}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: "Nunito_700Bold", color: theme.text }}>
              Pharmacy AI
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
              Powered by {providerLabel}
            </Text>
          </View>
        </View>

        <PharmacyScopeSelector
          visible={isSuperAdmin}
          pharmacies={pharmacies}
          selectedPharmacyId={pharmacyId}
          onSelect={setSelectedPharmacyTenantId}
          loading={isLoadingScope}
        />

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Crown color={isPremium ? theme.warning : theme.textSecondary} size={16} />
            <Text
              style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}
            >
              {isPremium ? "Premium Active" : "Premium Required"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {blockedReason || (aiEnabled ? "AI is enabled for this pharmacy." : "Enable AI to start using pharmacy tools.")}
          </Text>

          {!aiEnabled ? (
            <TouchableOpacity
              onPress={promptEnable}
              disabled={aiUpdateMutation.isLoading}
              style={{
                marginTop: 12,
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                opacity: aiUpdateMutation.isLoading ? 0.7 : 1,
              }}
            >
              {aiUpdateMutation.isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  Enable AI
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => aiUpdateMutation.mutate(false)}
              disabled={aiUpdateMutation.isLoading}
              style={{
                marginTop: 12,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Disable AI
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <PackageSearch color={theme.warning} size={16} />
            <Text
              style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}
            >
              Stock Forecast Copilot
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
            Forecast demand and reorder plan using last 30 days of stock movement.
          </Text>

          <TouchableOpacity
            onPress={() => aiStockForecastMutation.mutate()}
            disabled={!canUse || aiStockForecastMutation.isLoading || !pharmacyId}
            style={{
              backgroundColor: theme.warning,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !pharmacyId ? 0.6 : 1,
            }}
          >
            {aiStockForecastMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Generate Stock Forecast
              </Text>
            )}
          </TouchableOpacity>

          {!!stockForecastResult?.summary && (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 10,
                backgroundColor: theme.surface,
              }}
            >
              <TouchableOpacity
                onPress={() => speakAiText(getStockForecastSpeechText(stockForecastResult))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.card,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Forecast"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, lineHeight: 18 }}>
                {stockForecastResult.summary}
              </Text>
              {Array.isArray(stockForecastResult?.recommendations) &&
              stockForecastResult.recommendations.length > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Recommendations: {stockForecastResult.recommendations.join(" • ")}
                </Text>
              ) : null}
              {(Array.isArray(stockForecastResult?.urgent) ? stockForecastResult.urgent : [])
                .slice(0, 5)
                .map((item, index) => (
                  <Text key={`${String(item?.productId || "product")}-${index}`} style={{ marginTop: 4, fontSize: 12, color: theme.warning }}>
                    {index + 1}. {String(item?.name || "Product")} • stock {Number(item?.currentStock || 0)} • reorder{" "}
                    {Number(item?.recommendedQty || 0)}
                  </Text>
                ))}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Search color={theme.primary} size={16} />
            <Text
              style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}
            >
              Smart Search
            </Text>
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products, pharmacies, hospitals, medics..."
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => aiSearchMutation.mutate()}
            disabled={!canUse || !searchQuery.trim() || aiSearchMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !searchQuery.trim() ? 0.6 : 1,
            }}
          >
            {aiSearchMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Run AI Search
              </Text>
            )}
          </TouchableOpacity>

          {searchResults.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {searchResults.map((item) => (
                <View
                  key={`${item.type}-${item.id}`}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                    {item.name}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 12, color: theme.textSecondary }}>
                    {(item.type || "").toUpperCase()} {item.subtitle ? `• ${item.subtitle}` : ""}
                  </Text>
                  {item.reason ? (
                    <Text style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
                      {item.reason}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MessageCircle color={theme.accent} size={16} />
            <Text
              style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}
            >
              Pharmacy Copilot
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => runPharmacyPrompt(lowStockPrompt)}
              disabled={!canUse || aiAssistantMutation.isLoading}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <PackageSearch color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 12, color: theme.textSecondary }}>
                  Low Stock Plan
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => runPharmacyPrompt(demandPrompt)}
              disabled={!canUse || aiAssistantMutation.isLoading}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Sparkles color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 12, color: theme.textSecondary }}>
                  7-Day Strategy
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TextInput
            value={assistantQuery}
            onChangeText={setAssistantQuery}
            placeholder="Ask anything about products, stock, demand, workflow..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              fontSize: 13,
              minHeight: 86,
              textAlignVertical: "top",
            }}
          />
          <TouchableOpacity
            onPress={() => aiAssistantMutation.mutate(assistantQuery)}
            disabled={!canUse || !assistantQuery.trim() || aiAssistantMutation.isLoading}
            style={{
              marginTop: 10,
              backgroundColor: theme.accent,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse || !assistantQuery.trim() ? 0.6 : 1,
            }}
          >
            {aiAssistantMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Ask Pharmacy AI
              </Text>
            )}
          </TouchableOpacity>

          {!!assistantAnswer && (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 10,
                backgroundColor: theme.surface,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>{assistantAnswer}</Text>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <BarChart3 color={theme.info} size={16} />
            <Text
              style={{ marginLeft: 8, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}
            >
              AI Analytics Summary
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10 }}>
            Products: {products.length} • Low stock: {lowStockProducts.length} • Pending orders:{" "}
            {pendingOrders.length}
          </Text>

          <TouchableOpacity
            onPress={() => aiAnalyticsMutation.mutate()}
            disabled={!canUse || aiAnalyticsMutation.isLoading}
            style={{
              backgroundColor: theme.info,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: !canUse ? 0.6 : 1,
            }}
          >
            {aiAnalyticsMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                Generate AI Analytics
              </Text>
            )}
          </TouchableOpacity>

          {!!analyticsResult?.summary && (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 10,
                backgroundColor: theme.surface,
              }}
            >
              <TouchableOpacity
                onPress={() => speakAiText(getAnalyticsSpeechText(analyticsResult))}
                disabled={aiSpeaking}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  backgroundColor: theme.card,
                  opacity: aiSpeaking ? 0.7 : 1,
                }}
              >
                <Volume2 color={theme.iconColor} size={14} />
                <Text style={{ marginLeft: 6, fontSize: 11, color: theme.textSecondary }}>
                  {aiSpeaking ? "Reading..." : "Read Summary"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
                Summary
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: theme.text, lineHeight: 18 }}>
                {analyticsResult.summary}
              </Text>

              {!!analyticsResult?.insights?.length && (
                <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Insights: {analyticsResult.insights.join(" • ")}
                </Text>
              )}
              {!!analyticsResult?.alerts?.length && (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.warning, lineHeight: 18 }}>
                  Alerts: {analyticsResult.alerts.join(" • ")}
                </Text>
              )}
              {!!analyticsResult?.recommendations?.length && (
                <Text style={{ marginTop: 6, fontSize: 12, color: theme.success, lineHeight: 18 }}>
                  Recommendations: {analyticsResult.recommendations.join(" • ")}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
