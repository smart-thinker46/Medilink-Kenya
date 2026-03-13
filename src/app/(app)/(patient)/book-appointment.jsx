import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, MapPin, Search } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import { useAppTheme } from "@/components/ThemeProvider";
import ProfileRequiredBanner from "@/components/ProfileRequiredBanner";
import { useToast } from "@/components/ToastProvider";
import apiClient from "@/utils/api";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import {
  getLocationAddressLabel,
  normalizeLocation,
} from "@/utils/locationHelpers";
import UserAvatar from "@/components/UserAvatar";

export default function BookAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const initialMedicId = params?.medicId;
  const appointmentId = params?.appointmentId || params?.appointment_id;
  const isReschedule =
    String(params?.reschedule || "").toLowerCase() === "1" || Boolean(appointmentId);

  const { profile } = usePatientProfile();
  const completion = useMemo(() => getProfileCompletion(profile), [profile]);
  const isProfileComplete = completion.percent >= 99;

  const [medicId, setMedicId] = useState(initialMedicId || "");
  const [medicSearch, setMedicSearch] = useState("");
  const [showMedicSuggestions, setShowMedicSuggestions] = useState(false);
  const [mode, setMode] = useState("video");
  const [reason, setReason] = useState("");
  const [treatmentLocation, setTreatmentLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSelectedDetails, setShowSelectedDetails] = useState(true);

  const medicsQuery = useQuery({
    queryKey: ["medics", "all"],
    queryFn: () => apiClient.getMedics(),
  });
  const myLocationQuery = useQuery({
    queryKey: ["my-location", "book-appointment"],
    queryFn: () => apiClient.getMyLocation(),
  });
  const myLocation = useMemo(
    () => normalizeLocation(myLocationQuery.data?.location),
    [myLocationQuery.data],
  );
  const medics = medicsQuery.data?.items || medicsQuery.data || [];
  const medicsWithMeta = useMemo(
    () =>
      medics.map((medic) => {
        const id = medic.id || medic.medicId;
        const name =
          medic.name ||
          `${medic.firstName || ""} ${medic.lastName || ""}`.trim() ||
          "Unknown medic";
        const specialization = String(
          medic.specialization || medic.areaOfSpecialization || "",
        ).trim();
        const location = String(
          medic.locationAddress || medic.location || medic.city || medic.area || "",
        ).trim();
        const searchable = [name, specialization, location]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return {
          ...medic,
          id,
          name,
          avatarUrl: medic.avatarUrl || medic.profilePhoto || medic.profilePhotoUrl || "",
          specialization,
          location,
          experienceYears: medic.experienceYears ?? medic.experience ?? null,
          consultationFee: medic.consultationFee ?? medic.fee ?? null,
          email: medic.email || "",
          phone: medic.phone || "",
          rating: medic.rating ?? medic.averageRating ?? null,
          availability: medic.availability || medic.availableSlots || medic.nextAvailable || "",
          languages: Array.isArray(medic.languages)
            ? medic.languages
            : Array.isArray(medic.spokenLanguages)
              ? medic.spokenLanguages
              : typeof medic.languages === "string"
                ? medic.languages.split(",").map((item) => item.trim()).filter(Boolean)
                : [],
          searchable,
        };
      }),
    [medics],
  );
  const selectedMedic = useMemo(
    () => medicsWithMeta.find((medic) => medic.id === medicId) || null,
    [medicId, medicsWithMeta],
  );
  const consultationFee = useMemo(
    () => Number(selectedMedic?.consultationFee || 0),
    [selectedMedic],
  );
  const filteredMedicSuggestions = useMemo(() => {
    const query = String(medicSearch || "").trim().toLowerCase();
    if (!query) return medicsWithMeta.slice(0, 8);
    return medicsWithMeta
      .filter((medic) => medic.searchable.includes(query))
      .slice(0, 8);
  }, [medicSearch, medicsWithMeta]);

  useEffect(() => {
    if (!initialMedicId || !medicsWithMeta.length) return;
    const initialMedic = medicsWithMeta.find(
      (medic) => String(medic.id) === String(initialMedicId),
    );
    if (!initialMedic) return;
    setMedicId(initialMedic.id);
    setMedicSearch(initialMedic.name);
  }, [initialMedicId, medicsWithMeta]);

  const appointmentMutation = useMutation({
    mutationFn: (payload) => apiClient.createAppointment(payload),
    onSuccess: () => {
      showToast("Appointment booked successfully.", "success");
      router.push("/(app)/(patient)/appointments");
    },
    onError: (error) => {
      if (error?.missingFields?.length) {
        showToast(
          `Please complete: ${error.missingFields.join(", ")}`,
          "warning",
        );
        return;
      }
      showToast(error.message || "Booking failed. Please try again.", "error");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: (payload) => apiClient.updateAppointment(payload.id, payload.data),
    onSuccess: () => {
      showToast("Appointment rescheduled.", "success");
      router.push("/(app)/(patient)/appointments");
    },
    onError: (error) => {
      showToast(error.message || "Reschedule failed.", "error");
    },
  });

  const appointmentQuery = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const list = await apiClient.getAppointments();
      const items = list?.items || list || [];
      return items.find((item) => String(item.id) === String(appointmentId)) || null;
    },
    enabled: Boolean(appointmentId),
  });

  useEffect(() => {
    if (!appointmentQuery.data) return;
    const appt = appointmentQuery.data;
    const nextMedicId = appt?.medicId || appt?.medic_id;
    if (nextMedicId) {
      setMedicId(nextMedicId);
      const medic = medicsWithMeta.find((item) => String(item.id) === String(nextMedicId));
      if (medic) setMedicSearch(medic.name);
    }
    if (appt?.date) setDate(String(appt.date));
    if (appt?.time) setTime(String(appt.time));
    if (appt?.mode) setMode(String(appt.mode));
    if (appt?.reason) setReason(String(appt.reason));
    if (appt?.treatmentLocation) setTreatmentLocation(String(appt.treatmentLocation));
  }, [appointmentQuery.data, medicsWithMeta]);

  const formatDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = () => {
    if (!isProfileComplete) {
      if (completion.missingFields?.length) {
        showToast(
          `Please complete: ${completion.missingFields.join(", ")}`,
          "warning",
        );
      } else {
        showToast(
          "Please complete at least 99% of your profile before booking.",
          "warning",
        );
      }
      return;
    }
    if (!medicId || !date || !time) {
      showToast("Please select a medic, date and time.", "warning");
      return;
    }

    if (isReschedule && appointmentId) {
      rescheduleMutation.mutate({
        id: appointmentId,
        data: {
          status: "rescheduled",
          medic_id: medicId,
          date,
          time,
          mode,
          reason,
          rescheduleReason: reason,
          treatmentLocation: treatmentLocation.trim() || undefined,
        },
      });
      return;
    }

    const payload = {
      medic_id: medicId,
      date,
      time,
      mode,
      reason,
      treatmentLocation: treatmentLocation.trim() || undefined,
    };

    const fee = Number(selectedMedic?.consultationFee || 0);
    if (fee > 0) {
      (async () => {
        try {
          const payment = await apiClient.createPayment({
            amount: fee,
            currency: "KES",
            type: "APPOINTMENT",
            description: "Appointment Booking",
            recipientId: medicId,
            recipientRole: "MEDIC",
            phone: profile?.phone,
          });
          const paymentId = payment?.id || payment?.apiRef;
          if (!paymentId) {
            showToast("Payment reference missing.", "error");
            return;
          }
          const status = String(payment?.status || "").toUpperCase();
          if (status === "PAID") {
            appointmentMutation.mutate({ ...payload, paymentId });
            return;
          }
          await AsyncStorage.setItem(
            `pending-appointment:${paymentId}`,
            JSON.stringify({ ...payload, paymentId }),
          );
          showToast("Complete payment to finish booking.", "success");
          router.push(`/payment-result?api_ref=${paymentId}`);
        } catch (error) {
          showToast(error.message || "Payment initiation failed.", "error");
        }
      })();
      return;
    }

    appointmentMutation.mutate(payload);
  };

  const handleUseCurrentLocation = () => {
    if (!myLocation) {
      showToast("No saved location found. Set your location first.", "warning");
      return;
    }
    const address = getLocationAddressLabel(myLocation);
    if (!address) {
      showToast("Saved location has no address label yet.", "warning");
      return;
    }
    setTreatmentLocation(address);
    showToast("Treatment location filled from your saved location.", "success");
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
        {/* Header */}
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
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            {isReschedule ? "Reschedule Appointment" : "Book Appointment"}
          </Text>
        </View>

        {completion.percent < 100 && (
          <ProfileRequiredBanner
            percent={completion.percent}
            message={`Profile completion is ${completion.percent}%. Booking unlocks at 99%.`}
            onComplete={() => router.push("/(app)/(patient)/edit-profile")}
          />
        )}

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500 }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Search Medic
            </Text>
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                marginBottom: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Search size={16} color={theme.iconColor} />
                <TextInput
                  value={medicSearch}
                  onChangeText={(value) => {
                    setMedicSearch(value);
                    setMedicId("");
                    setShowMedicSuggestions(true);
                  }}
                  onFocus={() => setShowMedicSuggestions(true)}
                  placeholder="Type name, specialization or location"
                  placeholderTextColor={theme.textSecondary}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    color: theme.text,
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    paddingVertical: 6,
                  }}
                />
              </View>
              {showMedicSuggestions && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    marginTop: 8,
                    paddingTop: 8,
                    gap: 8,
                  }}
                >
                  {medicsQuery.isLoading ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      Loading medics...
                    </Text>
                  ) : filteredMedicSuggestions.length ? (
                    filteredMedicSuggestions.map((medic) => (
                      <TouchableOpacity
                        key={String(medic.id)}
                        activeOpacity={0.85}
                        onPress={() => {
                          setMedicId(medic.id);
                          setMedicSearch(medic.name);
                          setShowMedicSuggestions(false);
                        }}
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor:
                            medic.id === medicId ? theme.primary : theme.border,
                          backgroundColor:
                            medic.id === medicId
                              ? `${theme.primary}12`
                              : theme.backgroundSecondary || theme.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <UserAvatar
                          uri={medic.avatarUrl}
                          name={medic.name}
                          size={36}
                          backgroundColor={theme.surface}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: "Inter_600SemiBold",
                              color: theme.text,
                            }}
                          >
                            {medic.name}
                          </Text>
                          <Text
                            style={{
                              marginTop: 2,
                              fontSize: 12,
                              fontFamily: "Inter_400Regular",
                              color: theme.textSecondary,
                            }}
                          >
                            {[medic.specialization, medic.location]
                              .filter(Boolean)
                              .join(" • ") || "No extra details"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      No matching medics found.
                    </Text>
                  )}
                </View>
              )}
            </View>
            {selectedMedic ? (
              <View
                style={{
                  marginTop: -6,
                  marginBottom: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowSelectedDetails((prev) => !prev)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <UserAvatar
                    uri={selectedMedic.avatarUrl}
                    name={selectedMedic.name}
                    size={46}
                    backgroundColor={theme.backgroundSecondary || theme.surface}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.primary,
                      }}
                    >
                      Selected: {selectedMedic.name}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: theme.textSecondary,
                      }}
                    >
                      {[selectedMedic.specialization, selectedMedic.location]
                        .filter(Boolean)
                        .join(" • ") || "No extra details"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {showSelectedDetails ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>

                {showSelectedDetails && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    {selectedMedic.experienceYears != null ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Experience: {Number(selectedMedic.experienceYears) || 0} yrs
                      </Text>
                    ) : null}
                    {selectedMedic.consultationFee != null ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Consultation Fee: KES {Number(selectedMedic.consultationFee).toLocaleString()}
                      </Text>
                    ) : null}
                    {selectedMedic.rating != null ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Rating: {Number(selectedMedic.rating).toFixed(1)} / 5
                      </Text>
                    ) : null}
                    {selectedMedic.availability ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Availability: {String(selectedMedic.availability)}
                      </Text>
                    ) : null}
                    {selectedMedic.languages?.length ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Languages: {selectedMedic.languages.join(", ")}
                      </Text>
                    ) : null}
                    {selectedMedic.email ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Email: {selectedMedic.email}
                      </Text>
                    ) : null}
                    {selectedMedic.phone ? (
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        Phone: {selectedMedic.phone}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Appointment Mode
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {["video", "in-person"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      mode === option ? theme.primary : theme.border,
                    backgroundColor:
                      mode === option ? `${theme.primary}15` : theme.surface,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                  onPress={() => setMode(option)}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: mode === option ? theme.primary : theme.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Treatment Location
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <MapPin size={16} color={theme.iconColor} />
              <TextInput
                value={treatmentLocation}
                onChangeText={setTreatmentLocation}
                placeholder="Where should treatment happen?"
                placeholderTextColor={theme.textSecondary}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  paddingVertical: 14,
                  color: theme.text,
                  fontSize: 15,
                  fontFamily: "Inter_400Regular",
                }}
              />
            </View>
            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              activeOpacity={0.85}
              style={{
                marginTop: -6,
                marginBottom: 14,
                alignSelf: "flex-start",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.primary,
                }}
              >
                Use My Current Location
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Date
            </Text>
            {Platform.OS === "web" ? (
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={{
                  height: 52,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: theme.text,
                  marginBottom: 16,
                }}
                type="date"
              />
            ) : (
              <TouchableOpacity
                style={{
                  height: 52,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  marginBottom: 16,
                }}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar color={theme.iconColor} size={16} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_400Regular",
                      color: date ? theme.text : theme.textSecondary,
                      marginLeft: 8,
                    }}
                  >
                    {date || "Select date"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={date ? new Date(date) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== "ios") {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) {
                    setDate(formatDate(selectedDate));
                  }
                }}
              />
            )}

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Time
            </Text>
            {Platform.OS === "web" ? (
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={theme.textSecondary}
                style={{
                  height: 52,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: theme.text,
                  marginBottom: 16,
                }}
                type="time"
              />
            ) : (
              <TouchableOpacity
                style={{
                  height: 52,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  marginBottom: 16,
                }}
                onPress={() => setShowTimePicker(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock color={theme.iconColor} size={16} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_400Regular",
                      color: time ? theme.text : theme.textSecondary,
                      marginLeft: 8,
                    }}
                  >
                    {time || "Select time"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(event, selectedTime) => {
                  if (Platform.OS !== "ios") {
                    setShowTimePicker(false);
                  }
                  if (selectedTime) {
                    const hours = String(selectedTime.getHours()).padStart(2, "0");
                    const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
                    setTime(`${hours}:${minutes}`);
                  }
                }}
              />
            )}

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              {isReschedule ? "Reschedule Reason" : "Reason"}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={
                isReschedule
                  ? "Why do you need to reschedule?"
                  : "Describe your symptoms or reason"
              }
              placeholderTextColor={theme.textSecondary}
              style={{
                minHeight: 90,
                backgroundColor: theme.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                fontFamily: "Inter_400Regular",
                color: theme.text,
                marginBottom: 24,
              }}
              multiline
            />

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Consultation Fee
            </Text>
            <View
              style={{
                height: 52,
                backgroundColor: theme.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 16,
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_500Medium",
                  color: theme.text,
                }}
              >
                {consultationFee > 0
                  ? `KES ${consultationFee.toLocaleString()}`
                  : "No fee listed"}
              </Text>
            </View>
            {consultationFee > 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  marginBottom: 20,
                }}
              >
                Payment is required to complete the booking. Checkout opens via IntaSend.
              </Text>
            ) : (
              <View style={{ height: 12 }} />
            )}

            <Button
              title={
                isReschedule
                  ? "Reschedule Appointment"
                  : consultationFee > 0
                    ? "Pay & Book Appointment"
                    : "Confirm Appointment"
              }
              onPress={handleSubmit}
              loading={appointmentMutation.isLoading || rescheduleMutation.isLoading}
              disabled={!isProfileComplete}
            />
          </MotiView>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
