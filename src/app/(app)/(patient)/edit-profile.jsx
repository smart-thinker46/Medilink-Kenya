import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";
import {
  ArrowLeft,
  Camera,
  Upload,
  Shield,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import LocationPickerField from "@/components/LocationPickerField";
import { useAppTheme } from "@/components/ThemeProvider";
import { usePatientProfile } from "@/utils/usePatientProfile";
import { getProfileCompletion } from "@/utils/profileCompletion";
import { uploadFileIfNeeded } from "@/utils/upload";

const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita Taveta",
  "Tana River",
  "Tharaka Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { profile, updateProfile } = usePatientProfile();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "",
    homeCountry: "",
    subCounty: "",
    ward: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    preferredLanguage: "",
    bloodGroup: "",
    allergies: "",
    chronicCondition: "",
    locationAddress: "",
    locationLat: "",
    locationLng: "",
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [idFrontName, setIdFrontName] = useState("");
  const [idBackName, setIdBackName] = useState("");
  const [countyFocused, setCountyFocused] = useState(false);
  const countySuggestions = useMemo(() => {
    const query = String(formData.homeCountry || "").trim().toLowerCase();
    if (!countyFocused && !query) return [];
    if (!query) return KENYA_COUNTIES.slice(0, 10);
    return KENYA_COUNTIES.filter((county) =>
      county.toLowerCase().includes(query),
    ).slice(0, 10);
  }, [formData.homeCountry, countyFocused]);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        nationalId: profile.nationalId || profile.nationalIdNo || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        homeCountry: profile.homeCountry || "",
        subCounty: profile.subCounty || "",
        ward: profile.ward || "",
        address: profile.address || "",
        emergencyContactName: profile.emergencyContactName || "",
        emergencyContactPhone: profile.emergencyContactPhone || "",
        emergencyContactRelationship: profile.emergencyContactRelationship || "",
        preferredLanguage: profile.preferredLanguage || "",
        bloodGroup: profile.bloodGroup || "",
        allergies: profile.allergies || "",
        chronicCondition: profile.chronicCondition || "",
        locationAddress:
          profile.locationAddress || profile.location?.address || "",
        locationLat: profile.location?.lat?.toString() || "",
        locationLng: profile.location?.lng?.toString() || "",
      }));

      setProfilePhoto(
        profile.profilePhoto || profile.avatarUrl || profile.photoUrl || null,
      );
      setIdFront(profile.idFront || profile.idFrontUrl || null);
      setIdBack(profile.idBack || profile.idBackUrl || null);
      setIdFrontName(profile.idFrontName || "");
      setIdBackName(profile.idBackName || "");
    }
  }, [profile]);

  const completion = useMemo(() => getProfileCompletion(profile), [profile]);

  const formatDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleImagePick = async (setter, fromCamera = false) => {
    try {
      if (fromCamera) {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPerm.status !== "granted") {
          Alert.alert("Permission required", "Camera access is needed.");
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });

      if (!result.canceled && result.assets?.length) {
        setter(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Image Error", "Unable to pick image.");
    }
  };

  const handleDocumentPick = async (setter, nameSetter) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setter(asset.uri);
        nameSetter(asset.name || "document");
      }
    } catch (error) {
      Alert.alert("Document Error", "Unable to pick document.");
    }
  };

  const handleSave = async () => {
    const uploadedProfilePhoto = await uploadFileIfNeeded(profilePhoto, { kind: "image" });
    const uploadedIdFront = await uploadFileIfNeeded(idFront, { kind: "document" });
    const uploadedIdBack = await uploadFileIfNeeded(idBack, { kind: "document" });

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      nationalId: formData.nationalId,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      homeCountry: formData.homeCountry,
      subCounty: formData.subCounty,
      ward: formData.ward,
      address: formData.address,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      preferredLanguage: formData.preferredLanguage,
      bloodGroup: formData.bloodGroup,
      allergies: formData.allergies,
      chronicCondition: formData.chronicCondition,
      location: {
        address: formData.locationAddress,
        lat: formData.locationLat ? Number(formData.locationLat) : null,
        lng: formData.locationLng ? Number(formData.locationLng) : null,
      },
      profilePhoto: uploadedProfilePhoto,
      idFront: uploadedIdFront,
      idBack: uploadedIdBack,
      idFrontName: idFrontName || undefined,
      idBackName: idBackName || undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => {
        Alert.alert("Profile Updated", "Your profile has been saved.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: (error) => {
        Alert.alert("Update Failed", error.message || "Please try again.");
      },
    });
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
            Edit Profile
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile completion */}
          {completion.percent < 100 && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500 }}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Profile Completion: {completion.percent}%
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.surface,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${completion.percent}%`,
                    backgroundColor:
                      completion.percent >= 99 ? theme.success : theme.warning,
                  }}
                />
              </View>
            </MotiView>
          )}

          {/* Photo upload */}
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: theme.text,
                marginBottom: 12,
              }}
            >
              Profile Photo
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      fontFamily: "Inter_700Bold",
                      color: theme.textSecondary,
                    }}
                  >
                    +
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                  onPress={() => handleImagePick(setProfilePhoto, false)}
                >
                  <Upload color="#FFFFFF" size={16} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      marginLeft: 6,
                    }}
                  >
                    Upload
                  </Text>
                </TouchableOpacity>
                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => handleImagePick(setProfilePhoto, true)}
                  >
                    <Camera color={theme.iconColor} size={16} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: theme.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Basic info */}
          <Input
            label="First Name"
            value={formData.firstName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, firstName: value }))
            }
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, lastName: value }))
            }
            required
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, phone: value }))
            }
            keyboardType="phone-pad"
            required
          />
          <Input
            label="National ID No"
            value={formData.nationalId}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, nationalId: value }))
            }
            placeholder="e.g. 12345678"
          />
          <Input
            label="Home County"
            value={formData.homeCountry}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, homeCountry: value }))
            }
            onFocus={() => setCountyFocused(true)}
            onBlur={() => setTimeout(() => setCountyFocused(false), 120)}
            placeholder="Start typing your county"
            required
          />
          {countySuggestions.length > 0 && (
            <View style={{ marginTop: -8, marginBottom: 16 }}>
              {countySuggestions.map((county) => (
                <TouchableOpacity
                  key={county}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, homeCountry: county }))
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 12 }}>
                    {county}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Input
            label="Sub County"
            value={formData.subCounty}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, subCounty: value }))
            }
            required
          />
          <Input
            label="Ward"
            value={formData.ward}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, ward: value }))
            }
            required
          />

          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_500Medium",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Date of Birth
          </Text>
          {Platform.OS === "web" ? (
            <TextInput
              value={formData.dateOfBirth}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, dateOfBirth: value }))
              }
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
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: formData.dateOfBirth ? theme.text : theme.textSecondary,
                }}
              >
                {formData.dateOfBirth || "Select date"}
              </Text>
            </TouchableOpacity>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS !== "ios") {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setFormData((prev) => ({
                    ...prev,
                    dateOfBirth: formatDate(selectedDate),
                  }));
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
            Gender
          </Text>
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              marginBottom: 16,
            }}
          >
            <Picker
              selectedValue={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              style={{ color: theme.text }}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="Select gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          {/* Emergency contact */}
          <Input
            label="Emergency Contact Name"
            value={formData.emergencyContactName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, emergencyContactName: value }))
            }
            required
          />
          <Input
            label="Emergency Contact Phone"
            value={formData.emergencyContactPhone}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, emergencyContactPhone: value }))
            }
            keyboardType="phone-pad"
            required
          />
          <Input
            label="Emergency Contact Relationship"
            value={formData.emergencyContactRelationship}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, emergencyContactRelationship: value }))
            }
            required
          />
          <Input
            label="Preferred Language"
            value={formData.preferredLanguage}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, preferredLanguage: value }))
            }
            required
          />
          <Input
            label="Blood Group (optional)"
            value={formData.bloodGroup}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, bloodGroup: value }))
            }
            placeholder="A+, O-, AB..."
          />
          <Input
            label="Allergies (optional)"
            value={formData.allergies}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, allergies: value }))
            }
            placeholder="Comma separated"
          />
          <Input
            label="Chronic Condition (optional)"
            value={formData.chronicCondition}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, chronicCondition: value }))
            }
            placeholder="e.g. Hypertension, Diabetes"
          />

          {/* Location */}
          <LocationPickerField
            title="My Location (optional)"
            address={formData.locationAddress}
            lat={formData.locationLat}
            lng={formData.locationLng}
            onChange={(updates) =>
              setFormData((prev) => ({
                ...prev,
                ...updates,
              }))
            }
          />

          {/* ID uploads */}
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Shield color={theme.primary} size={18} />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginLeft: 8,
                }}
              >
                ID Verification
              </Text>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: theme.textSecondary,
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              Upload a clear photo of your ID (front and back) (optional)
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => handleDocumentPick(setIdFront, setIdFrontName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {idFrontName || (idFront ? "ID Front selected" : "Upload Front")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => handleDocumentPick(setIdBack, setIdBackName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {idBackName || (idBack ? "ID Back selected" : "Upload Back")}
                </Text>
              </TouchableOpacity>
            </View>

            {Platform.OS !== "web" && (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => handleImagePick(setIdFront, true)}
                >
                  <Camera color={theme.iconColor} size={16} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    Take Front
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => handleImagePick(setIdBack, true)}
                >
                  <Camera color={theme.iconColor} size={16} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: theme.textSecondary,
                      marginLeft: 6,
                    }}
                  >
                    Take Back
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Button
            title="Save Profile"
            onPress={handleSave}
            loading={updateProfile.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
