import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ArrowLeft, Camera, Upload } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import LocationPickerField from "@/components/LocationPickerField";
import { useAppTheme } from "@/components/ThemeProvider";
import { useMedicProfile } from "@/utils/useMedicProfile";
import { uploadFileIfNeeded } from "@/utils/upload";
import { validatePickedFiles } from "@/utils/fileValidation";

export default function MedicEditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { profile, updateProfile } = useMedicProfile();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    professionalType: "",
    specialization: "",
    licenseNumber: "",
    institution: "",
    qualifications: "",
    yearCompleted: "",
    certifications: "",
    experienceYears: "",
    hourlyRate: "",
    availableCounties: "",
    preferredShiftTypes: "",
    modeOfTransport: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    verificationStatus: "",
    verifiedAt: "",
    locationAddress: "",
    locationLat: "",
    locationLng: "",
    consultationFee: "",
    rating: "",
    availability: "",
    languages: "",
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState("");
  const [licenseName, setLicenseName] = useState("");
  const [idFrontName, setIdFrontName] = useState("");
  const [idBackName, setIdBackName] = useState("");

  const resolveUploadKind = (value, preferredName = "") => {
    const ref = String(preferredName || value || "").toLowerCase();
    if (/\.(png|jpg|jpeg|webp|heic|heif)$/i.test(ref)) return "image";
    return "document";
  };

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        professionalType: profile.professionalType || "",
        specialization: profile.specialization || "",
        licenseNumber: profile.licenseNumber || "",
        institution: profile.institution || "",
        qualifications: profile.qualifications || "",
        yearCompleted: profile.yearCompleted?.toString() || "",
        certifications: profile.certifications || "",
        experienceYears: profile.experienceYears?.toString() || "",
        hourlyRate: profile.hourlyRate?.toString() || "",
        availableCounties: Array.isArray(profile.availableCounties)
          ? profile.availableCounties.join(", ")
          : profile.availableCounties || "",
        preferredShiftTypes: Array.isArray(profile.preferredShiftTypes)
          ? profile.preferredShiftTypes.join(", ")
          : profile.preferredShiftTypes || "",
        modeOfTransport: profile.modeOfTransport || "",
        bankName: profile.bankName || "",
        bankAccountNumber: profile.bankAccountNumber || "",
        bankAccountName: profile.bankAccountName || "",
        verificationStatus: profile.verificationStatus || "",
        verifiedAt: profile.verifiedAt || "",
        locationAddress:
          profile.locationAddress || profile.location?.address || "",
        locationLat: profile.location?.lat?.toString() || "",
        locationLng: profile.location?.lng?.toString() || "",
        consultationFee: profile.consultationFee?.toString() || "",
        rating: profile.rating?.toString() || "",
        availability: profile.availability || "",
        languages: Array.isArray(profile.languages)
          ? profile.languages.join(", ")
          : profile.languages || "",
      }));

      setProfilePhoto(
        profile.profilePhoto || profile.avatarUrl || profile.photoUrl || null,
      );
      setLicensePhoto(profile.licenseUrl || profile.license || null);
      setIdFront(profile.idFront || profile.idFrontUrl || null);
      setIdBack(profile.idBack || profile.idBackUrl || null);
      setCvFile(profile.cvUrl || profile.cv || null);
      setLicenseName(profile.licenseName || "");
      setIdFrontName(profile.idFrontName || "");
      setIdBackName(profile.idBackName || "");
      setCvFileName(profile.cvName || "");
    }
  }, [profile]);

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
        const asset = result.assets[0];
        const { accepted, rejected, message } = validatePickedFiles([asset], {
          allowImages: true,
          maxBytes: 4 * 1024 * 1024,
        });
        if (rejected.length) {
          Alert.alert("Photo rejected", message);
        }
        if (!accepted.length) return;
        setter(accepted[0].uri);
      }
    } catch (error) {
      Alert.alert("Image Error", "Unable to pick image.");
    }
  };

  const handleCvPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setCvFile(asset.uri);
        setCvFileName(asset.name || "cv-document");
      }
    } catch (error) {
      Alert.alert("Document Error", "Unable to pick document.");
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
    if (updateProfile.isLoading) return;
    if (!formData.licenseNumber.trim()) {
      Alert.alert("Missing Info", "Please enter your medical license number.");
      return;
    }
    if (!formData.experienceYears.trim()) {
      Alert.alert("Missing Info", "Please enter your years of experience.");
      return;
    }
    const experienceValue = Number(formData.experienceYears);
    if (Number.isNaN(experienceValue) || experienceValue < 0) {
      Alert.alert("Invalid Experience", "Experience years must be a valid number.");
      return;
    }
    if (!formData.consultationFee.trim()) {
      Alert.alert("Missing Info", "Please enter your consultation fee.");
      return;
    }
    const feeValue = Number(formData.consultationFee);
    if (Number.isNaN(feeValue) || feeValue <= 0) {
      Alert.alert("Invalid Fee", "Consultation fee must be a valid number.");
      return;
    }

    try {
      const uploadedProfilePhoto = await uploadFileIfNeeded(profilePhoto, { kind: "image" });
      const uploadedLicense = await uploadFileIfNeeded(licensePhoto, {
        kind: resolveUploadKind(licensePhoto, licenseName),
      });
      const uploadedCv = await uploadFileIfNeeded(cvFile, { kind: "document" });

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        professionalType: formData.professionalType,
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
        institution: formData.institution,
        qualifications: formData.qualifications,
        yearCompleted: formData.yearCompleted ? Number(formData.yearCompleted) : null,
        certifications: formData.certifications,
        experienceYears: formData.experienceYears
          ? Number(formData.experienceYears)
          : null,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        availableCounties: formData.availableCounties
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        preferredShiftTypes: formData.preferredShiftTypes
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        modeOfTransport: formData.modeOfTransport,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountName: formData.bankAccountName,
        verificationStatus: formData.verificationStatus || undefined,
        verifiedAt: formData.verifiedAt || undefined,
        location: {
          address: formData.locationAddress,
          lat: formData.locationLat ? Number(formData.locationLat) : null,
          lng: formData.locationLng ? Number(formData.locationLng) : null,
        },
        consultationFee: formData.consultationFee
          ? Number(formData.consultationFee)
          : null,
        rating: formData.rating ? Number(formData.rating) : null,
        availability: formData.availability,
        availableDays: formData.availability
          ? formData.availability
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        languages: formData.languages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        profilePhoto: uploadedProfilePhoto,
        profilePhotoUrl: uploadedProfilePhoto,
        license: uploadedLicense,
        licenseUrl: uploadedLicense,
        licenseName: licenseName || undefined,
        idFront: idFront ? await uploadFileIfNeeded(idFront, { kind: resolveUploadKind(idFront, idFrontName) }) : undefined,
        idBack: idBack ? await uploadFileIfNeeded(idBack, { kind: resolveUploadKind(idBack, idBackName) }) : undefined,
        idFrontName: idFrontName || undefined,
        idBackName: idBackName || undefined,
        cv: uploadedCv,
        cvUrl: uploadedCv,
        cvName: cvFileName || undefined,
      };

      updateProfile.mutate(payload, {
        onSuccess: () => {
          Alert.alert("Profile Updated", "Medic profile saved.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (error) => {
          const missing = error?.missingFields?.length
            ? `\nMissing: ${error.missingFields.join(", ")}`
            : "";
          Alert.alert(
            "Update Failed",
            `${error.message || "Please try again."}${missing}`,
          );
        },
      });
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to upload files. Please try again.",
      );
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
              fontSize: 24,
              fontFamily: "Nunito_700Bold",
              color: theme.text,
            }}
          >
            Edit Medic Profile
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
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
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, dateOfBirth: value }))
            }
            placeholder="YYYY-MM-DD"
            required
          />
          <Input
            label="Gender"
            value={formData.gender}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, gender: value }))
            }
            placeholder="Male / Female / Other"
            required
          />
          <Input
            label="Professional Type"
            value={formData.professionalType}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, professionalType: value }))
            }
            placeholder="Doctor, Nurse, Clinical Officer..."
            required
          />
          <Input
            label="Specialization"
            value={formData.specialization}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, specialization: value }))
            }
            required
          />
          <Input
            label="Medical License Number"
            value={formData.licenseNumber}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, licenseNumber: value }))
            }
            required
          />
          <Input
            label="Institution"
            value={formData.institution}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, institution: value }))
            }
            required
          />
          <Input
            label="Qualifications"
            value={formData.qualifications}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, qualifications: value }))
            }
            required
          />
          <Input
            label="Year Completed"
            value={formData.yearCompleted}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, yearCompleted: value }))
            }
            keyboardType="numeric"
            required
          />
          <Input
            label="Certifications"
            value={formData.certifications}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, certifications: value }))
            }
            placeholder="Comma separated"
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Experience (Years)"
              value={formData.experienceYears}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, experienceYears: value }))
              }
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Consultation Fee (KES)"
              value={formData.consultationFee}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, consultationFee: value }))
              }
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Hourly Rate (KES)"
              value={formData.hourlyRate}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, hourlyRate: value }))
              }
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Mode of Transport"
              value={formData.modeOfTransport}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, modeOfTransport: value }))
              }
              placeholder="Private/Public Vehicle"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <Input
            label="Available Counties"
            value={formData.availableCounties}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, availableCounties: value }))
            }
            placeholder="Comma separated"
            required
          />
          <Input
            label="Preferred Shift Types"
            value={formData.preferredShiftTypes}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, preferredShiftTypes: value }))
            }
            placeholder="Day, Night..."
            required
          />
          <Input
            label="Languages Spoken"
            value={formData.languages}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, languages: value }))
            }
            placeholder="English, Swahili"
          />
          <Input
            label="Availability"
            value={formData.availability}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, availability: value }))
            }
            placeholder="Mon–Fri, 9am–5pm"
          />
          <Input
            label="Rating (0-5)"
            value={formData.rating}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, rating: value }))
            }
            keyboardType="numeric"
            placeholder="4.5"
          />
          <Input
            label="Bank Name"
            value={formData.bankName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, bankName: value }))
            }
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Account Number"
              value={formData.bankAccountNumber}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, bankAccountNumber: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Account Name"
              value={formData.bankAccountName}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, bankAccountName: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Verification Status"
              value={formData.verificationStatus}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, verificationStatus: value }))
              }
              placeholder="pending / verified / rejected"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Verified At"
              value={formData.verifiedAt}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, verifiedAt: value }))
              }
              placeholder="YYYY-MM-DDTHH:mm:ssZ"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <LocationPickerField
            title="Medic Location"
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
              Verification Documents
            </Text>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  width: "100%",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => handleDocumentPick(setLicensePhoto, setLicenseName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {licenseName || (licensePhoto ? "License selected" : "Upload License")}
                </Text>
              </TouchableOpacity>
            </View>
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
                  {idFrontName || (idFront ? "ID Front selected" : "Upload ID Front")}
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
                  {idBackName || (idBack ? "ID Back selected" : "Upload ID Back")}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={handleCvPick}
            >
              <Upload color={theme.iconColor} size={16} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.textSecondary,
                  marginLeft: 6,
                }}
              >
                {cvFile ? "Replace CV" : "Upload CV"}
              </Text>
            </TouchableOpacity>
            {cvFileName ? (
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: theme.textSecondary,
                }}
              >
                {cvFileName}
              </Text>
            ) : null}
          </View>

          <Button
            title="Save Medic Profile"
            onPress={handleSave}
            loading={updateProfile.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
