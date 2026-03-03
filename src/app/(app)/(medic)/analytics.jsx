import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, { Circle, G } from "react-native-svg";
import { ArrowLeft, PieChart, MessageCircle, Video, Crown, MapPin } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { useAppTheme } from "@/components/ThemeProvider";
import apiClient from "@/utils/api";
import useMedicScope from "@/utils/useMedicScope";
import MedicScopeSelector from "@/components/MedicScopeSelector";

const Donut = ({ title, data = [], theme, size = 112, stroke = 14 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let running = 0;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 160,
        backgroundColor: theme.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.text }}>{title}</Text>
      <View style={{ alignItems: "center", justifyContent: "center", marginTop: 10 }}>
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Svg width={size} height={size}>
            <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.surface} strokeWidth={stroke} fill="transparent" />
              {total > 0 &&
                data.map((item, index) => {
                  const value = Number(item.value || 0);
                  const segment = (value / total) * circumference;
                  const dashoffset = circumference - running;
                  running += segment;
                  return (
                    <Circle
                      key={`${item.label}-${index}`}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${segment} ${circumference - segment}`}
                      strokeDashoffset={dashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  );
                })}
            </G>
          </Svg>
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Nunito_700Bold", color: theme.text }}>{total}</Text>
            <Text style={{ fontSize: 10, color: theme.textSecondary }}>Total</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function MedicAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { isSuperAdmin, medicUserId, medics, setSelectedMedicUserId, isLoadingScope } = useMedicScope();

  const hiresQuery = useQuery({
    queryKey: ["medic-hires", medicUserId],
    queryFn: () => apiClient.getMedicHires({ medicId: medicUserId || undefined }),
    enabled: Boolean(medicUserId),
  });
  const analyticsQuery = useQuery({
    queryKey: ["medic-analytics", "me", medicUserId],
    queryFn: () => apiClient.getMedicAnalytics({ medicId: medicUserId || undefined }),
    enabled: Boolean(medicUserId),
  });

  const analyticsTotals = analyticsQuery.data?.totals || {};
  const analyticsCharts = analyticsQuery.data?.charts || {};
  const hires = hiresQuery.data || [];
  const linkedHospitalId = hires[0]?.hospitalAdminId || "";
  const formatMoney = (value) => `KES ${Number(value || 0).toLocaleString()}`;

  return (
    <ScreenLayout>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(medic)"))}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color={theme.iconColor} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <PieChart color={theme.primary} size={18} />
            <Text style={{ marginLeft: 8, fontSize: 20, fontFamily: "Nunito_700Bold", color: theme.text }}>Medic Analytics</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <MedicScopeSelector
          visible={isSuperAdmin}
          medics={medics}
          selectedMedicId={medicUserId}
          onSelect={setSelectedMedicUserId}
          loading={isLoadingScope}
        />

        <View style={{ marginTop: 16, flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Donut
            title="Patient Status"
            theme={theme}
            data={[
              { label: "Under Treatment", value: analyticsCharts?.patientStatus?.underTreatment || 0, color: theme.warning },
              { label: "Recovered", value: analyticsCharts?.patientStatus?.recovered || 0, color: theme.success },
            ]}
          />
          <Donut
            title="Finance"
            theme={theme}
            data={[
              { label: "Paid", value: analyticsCharts?.finance?.paid || 0, color: theme.success },
              { label: "Pending", value: analyticsCharts?.finance?.pending || 0, color: theme.warning },
            ]}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Patients served: {analyticsTotals.patientsServed || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Under treatment: {analyticsTotals.underTreatment || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Recovered: {analyticsTotals.recoveredPatients || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Prescriptions issued: {analyticsTotals.prescriptionsIssued || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Clinical updates: {analyticsTotals.clinicalUpdates || 0}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Money made: {formatMoney(analyticsTotals.moneyMade)}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Pending money: {formatMoney(analyticsTotals.pendingMoney)}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Pending from patients under treatment: {formatMoney(analyticsTotals.pendingFromTreatingPatients)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderTopWidth: isDark ? 0 : 1.5,
              borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push("/(app)/(shared)/location")}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>Set My Location</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>Save approximate location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: linkedHospitalId ? theme.card : theme.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: linkedHospitalId ? 1 : 0.6,
            }}
            disabled={!linkedHospitalId}
            onPress={() =>
              router.push({
                pathname: "/(app)/(shared)/location",
                params: { targetId: linkedHospitalId, title: "Hospital Location" },
              })
            }
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>View Hospital Location</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>From your hire</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderTopWidth: isDark ? 0 : 1.5,
            borderTopColor: isDark ? theme.border : theme.accent,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
          onPress={() => router.push("/(app)/(shared)/nearby-map")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MapPin color={theme.primary} size={16} />
            <Text style={{ marginLeft: 8, fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text }}>
              Nearby Medics & Users
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
            See nearby medics and linked users on a map
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderTopWidth: isDark ? 0 : 1.5,
              borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push("/(app)/(shared)/conversations")}
          >
            <MessageCircle color={theme.iconColor} size={18} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginLeft: 8 }}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderTopWidth: isDark ? 0 : 1.5,
              borderTopColor: isDark ? theme.border : theme.accent,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push("/(app)/(medic)/video-call")}
          >
            <Video color={theme.iconColor} size={18} />
            <Crown color={theme.warning} size={14} style={{ marginLeft: 6 }} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.text, marginLeft: 8 }}>
              Video Call
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
