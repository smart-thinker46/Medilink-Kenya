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
import { ArrowLeft, Camera, Upload, Shield } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import LocationPickerField from "@/components/LocationPickerField";
import { useAppTheme } from "@/components/ThemeProvider";
import { useHospitalProfile } from "@/utils/useHospitalProfile";
import { uploadFileIfNeeded } from "@/utils/upload";

export default function HospitalEditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { profile, updateProfile } = useHospitalProfile();

  const [formData, setFormData] = useState({
    hospitalName: "",
    facilityType: "",
    registrationNumber: "",
    adminName: "",
    adminContact: "",
    adminEmail: "",
    website: "",
    managerName: "",
    managerPhone: "",
    phone: "",
    address: "",
    county: "",
    subCounty: "",
    nearestTown: "",
    bedCapacity: "",
    specialties: "",
    operatingHours: "",
    workingDays: "",
    paymentModes: "",
    patientVolume: "",
    verificationStatus: "",
    verifiedAt: "",
    locationAddress: "",
    locationLat: "",
    locationLng: "",
  });

  const [logoPhoto, setLogoPhoto] = useState(null);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [adminIdPhoto, setAdminIdPhoto] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [licenseName, setLicenseName] = useState("");
  const [adminIdName, setAdminIdName] = useState("");
  const [cvFileName, setCvFileName] = useState("");

  const resolveUploadKind = (value, preferredName = "") => {
    const ref = String(preferredName || value || "").toLowerCase();
    if (/\.(png|jpg|jpeg|webp|heic|heif)$/i.test(ref)) return "image";
    return "document";
  };

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        hospitalName: profile.hospitalName || "",
        facilityType: profile.facilityType || "",
        registrationNumber: profile.registrationNumber || "",
        adminName:
          profile.adminName ||
          `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        adminContact: profile.adminContact || profile.phone || "",
        adminEmail: profile.adminEmail || profile.email || "",
        website: profile.website || "",
        managerName: profile.managerName || "",
        managerPhone: profile.managerPhone || "",
        phone: profile.phone || "",
        address: profile.address || "",
        county: profile.county || "",
        subCounty: profile.subCounty || "",
        nearestTown: profile.nearestTown || "",
        bedCapacity: profile.bedCapacity?.toString() || "",
        specialties: Array.isArray(profile.specialties)
          ? profile.specialties.join(", ")
          : profile.specialties || "",
        operatingHours: profile.operatingHours || "",
        workingDays: Array.isArray(profile.workingDays)
          ? profile.workingDays.join(", ")
          : profile.workingDays || "",
        paymentModes: Array.isArray(profile.paymentModes)
          ? profile.paymentModes.join(", ")
          : profile.paymentModes || "",
        patientVolume: profile.patientVolume?.toString() || "",
        verificationStatus: profile.verificationStatus || "",
        verifiedAt: profile.verifiedAt || "",
        locationAddress:
          profile.locationAddress || profile.location?.address || "",
        locationLat: profile.location?.lat?.toString() || "",
        locationLng: profile.location?.lng?.toString() || "",
      }));

      setLogoPhoto(profile.profilePhoto || profile.photoUrl || null);
      setLicensePhoto(profile.licenseUrl || profile.license || null);
      setAdminIdPhoto(profile.adminIdUrl || profile.adminId || null);
      setCvFile(profile.cvUrl || profile.cv || null);
      setLicenseName(profile.licenseName || "");
      setAdminIdName(profile.adminIdName || "");
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

  const handleSave = async () => {
    if (updateProfile.isLoading) return;
    try {
      const uploadedLogo = await uploadFileIfNeeded(logoPhoto, { kind: "image" });
      const uploadedLicense = await uploadFileIfNeeded(licensePhoto, {
        kind: resolveUploadKind(licensePhoto, licenseName),
      });
      const uploadedAdminId = await uploadFileIfNeeded(adminIdPhoto, {
        kind: resolveUploadKind(adminIdPhoto, adminIdName),
      });
      const uploadedCv = await uploadFileIfNeeded(cvFile, { kind: "document" });

      const payload = {
        hospitalName: formData.hospitalName,
        facilityType: formData.facilityType,
        registrationNumber: formData.registrationNumber,
        adminName: formData.adminName,
        adminContact: formData.adminContact,
        adminEmail: formData.adminEmail,
        website: formData.website,
        managerName: formData.managerName,
        managerPhone: formData.managerPhone,
        phone: formData.phone,
        address: formData.address,
        county: formData.county,
        subCounty: formData.subCounty,
        nearestTown: formData.nearestTown,
        bedCapacity: Number(formData.bedCapacity) || 0,
        specialties: formData.specialties
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        operatingHours: formData.operatingHours,
        workingDays: formData.workingDays
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        paymentModes: formData.paymentModes
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        patientVolume: Number(formData.patientVolume) || 0,
        verificationStatus: formData.verificationStatus || undefined,
        verifiedAt: formData.verifiedAt || undefined,
        location: {
          address: formData.locationAddress,
          lat: formData.locationLat ? Number(formData.locationLat) : null,
          lng: formData.locationLng ? Number(formData.locationLng) : null,
        },
        profilePhoto: uploadedLogo,
        profilePhotoUrl: uploadedLogo,
        license: uploadedLicense,
        licenseUrl: uploadedLicense,
        licenseName: licenseName || undefined,
        adminId: uploadedAdminId,
        adminIdUrl: uploadedAdminId,
        adminIdName: adminIdName || undefined,
        cv: uploadedCv,
        cvUrl: uploadedCv,
        cvName: cvFileName || undefined,
      };

      updateProfile.mutate(payload, {
        onSuccess: () => {
          Alert.alert("Profile Updated", "Hospital profile saved.", [
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
            Edit Hospital Profile
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
              Hospital Logo / Photo
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {logoPhoto ? (
                  <Image
                    source={{ uri: logoPhoto }}
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
                  onPress={() => handleImagePick(setLogoPhoto, false)}
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
                    onPress={() => handleImagePick(setLogoPhoto, true)}
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
            label="Hospital Name"
            value={formData.hospitalName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, hospitalName: value }))
            }
            required
          />
          <Input
            label="Facility Type"
            value={formData.facilityType}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, facilityType: value }))
            }
            required
          />
          <Input
            label="Registration Number"
            value={formData.registrationNumber}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, registrationNumber: value }))
            }
            required
          />
          <Input
            label="Admin Name"
            value={formData.adminName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, adminName: value }))
            }
            required
          />
          <Input
            label="Administrator Contact"
            value={formData.adminContact}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, adminContact: value }))
            }
            required
          />
          <Input
            label="Administrator Email"
            value={formData.adminEmail}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, adminEmail: value }))
            }
            keyboardType="email-address"
            required
          />
          <Input
            label="Hospital Website (optional)"
            value={formData.website}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, website: value }))
            }
            keyboardType="url"
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Manager Name"
              value={formData.managerName}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, managerName: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Manager Phone"
              value={formData.managerPhone}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, managerPhone: value }))
              }
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <Input
            label="Phone"
            value={formData.phone}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, phone: value }))
            }
            keyboardType="phone-pad"
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="County"
              value={formData.county}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, county: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Sub County"
              value={formData.subCounty}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, subCounty: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <Input
            label="Nearest Town"
            value={formData.nearestTown}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, nearestTown: value }))
            }
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Bed Capacity"
              value={formData.bedCapacity}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, bedCapacity: value }))
              }
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Operating Hours/Day"
              value={formData.operatingHours}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, operatingHours: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <Input
            label="Specialties (comma separated)"
            value={formData.specialties}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, specialties: value }))
            }
            required
          />
          <Input
            label="Working Days (comma separated)"
            value={formData.workingDays}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, workingDays: value }))
            }
            required
          />
          <Input
            label="Address"
            value={formData.address}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, address: value }))
            }
            required
          />
          <Input
            label="Payment Modes (comma separated)"
            value={formData.paymentModes}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, paymentModes: value }))
            }
          />
          <Input
            label="Approx. Patient Volume"
            value={formData.patientVolume}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, patientVolume: value }))
            }
            keyboardType="numeric"
          />
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
            title="Hospital Location"
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
                Verification Documents
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
              Upload hospital license, admin ID and CV
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
                onPress={() => handleDocumentPick(setAdminIdPhoto, setAdminIdName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {adminIdName || (adminIdPhoto ? "Admin ID selected" : "Upload Admin ID")}
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
            title="Save Hospital Profile"
            onPress={handleSave}
            loading={updateProfile.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
