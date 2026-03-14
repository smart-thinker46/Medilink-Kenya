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
import { usePharmacyProfile } from "@/utils/usePharmacyProfile";
import { uploadFileIfNeeded } from "@/utils/upload";
import { validatePickedFiles } from "@/utils/fileValidation";

export default function PharmacyEditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { profile, updateProfile } = usePharmacyProfile();

  const [formData, setFormData] = useState({
    pharmacyName: "",
    pharmacyType: "",
    registrationNumber: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    phone: "",
    address: "",
    county: "",
    townCity: "",
    operatingHours: "",
    offDays: "",
    deliveryAvailable: "",
    deliveryFee: "",
    pharmacistInChargeName: "",
    pharmacistInChargePhone: "",
    pharmacistInChargeEmail: "",
    paymentMethod: "",
    verificationStatus: "",
    verifiedAt: "",
    locationAddress: "",
    locationLat: "",
    locationLng: "",
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [ownerIdFront, setOwnerIdFront] = useState(null);
  const [ownerIdBack, setOwnerIdBack] = useState(null);
  const [licenseName, setLicenseName] = useState("");
  const [ownerIdFrontName, setOwnerIdFrontName] = useState("");
  const [ownerIdBackName, setOwnerIdBackName] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        pharmacyName: profile.pharmacyName || "",
        pharmacyType: profile.pharmacyType || "",
        registrationNumber: profile.registrationNumber || "",
        ownerName: profile.ownerName || "",
        ownerPhone: profile.ownerPhone || "",
        ownerEmail: profile.ownerEmail || "",
        phone: profile.phone || "",
        address: profile.address || "",
        county: profile.county || "",
        townCity: profile.townCity || "",
        operatingHours: profile.operatingHours || "",
        offDays: Array.isArray(profile.offDays)
          ? profile.offDays.join(", ")
          : profile.offDays || "",
        deliveryAvailable:
          typeof profile.deliveryAvailable === "boolean"
            ? String(profile.deliveryAvailable)
            : "",
        deliveryFee:
          profile.deliveryFee !== null && profile.deliveryFee !== undefined
            ? String(profile.deliveryFee)
            : "",
        pharmacistInChargeName: profile.pharmacistInChargeName || "",
        pharmacistInChargePhone: profile.pharmacistInChargePhone || "",
        pharmacistInChargeEmail: profile.pharmacistInChargeEmail || "",
        paymentMethod: Array.isArray(profile.paymentMethod)
          ? profile.paymentMethod.join(", ")
          : profile.paymentMethod || "",
        verificationStatus: profile.verificationStatus || "",
        verifiedAt: profile.verifiedAt || "",
        locationAddress:
          profile.locationAddress || profile.location?.address || "",
        locationLat: profile.location?.lat?.toString() || "",
        locationLng: profile.location?.lng?.toString() || "",
      }));

      setProfilePhoto(profile.profilePhoto || profile.photoUrl || null);
      setLicensePhoto(profile.licenseUrl || profile.license || null);
      setOwnerIdFront(profile.ownerIdFront || profile.ownerIdFrontUrl || null);
      setOwnerIdBack(profile.ownerIdBack || profile.ownerIdBackUrl || null);
      setLicenseName(profile.licenseName || "");
      setOwnerIdFrontName(profile.ownerIdFrontName || "");
      setOwnerIdBackName(profile.ownerIdBackName || "");
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
    try {
      const uploadedProfilePhoto = await uploadFileIfNeeded(profilePhoto, { kind: "image" });
      const uploadedLicense = await uploadFileIfNeeded(licensePhoto, { kind: "document" });
      const uploadedOwnerIdFront = await uploadFileIfNeeded(ownerIdFront, { kind: "document" });
      const uploadedOwnerIdBack = await uploadFileIfNeeded(ownerIdBack, { kind: "document" });
      const deliveryAvailable = String(formData.deliveryAvailable).toLowerCase() === "true";

      const payload = {
        pharmacyName: formData.pharmacyName,
        pharmacyType: formData.pharmacyType,
        registrationNumber: formData.registrationNumber,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail,
        phone: formData.phone,
        address: formData.address,
        county: formData.county,
        townCity: formData.townCity,
        operatingHours: formData.operatingHours,
        offDays: formData.offDays
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        deliveryAvailable,
        deliveryFee: deliveryAvailable ? Number(formData.deliveryFee || 0) : 0,
        pharmacistInChargeName: formData.pharmacistInChargeName,
        pharmacistInChargePhone: formData.pharmacistInChargePhone,
        pharmacistInChargeEmail: formData.pharmacistInChargeEmail,
        paymentMethod: formData.paymentMethod
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        verificationStatus: formData.verificationStatus || undefined,
        verifiedAt: formData.verifiedAt || undefined,
        location: {
          address: formData.locationAddress,
          lat: formData.locationLat ? Number(formData.locationLat) : null,
          lng: formData.locationLng ? Number(formData.locationLng) : null,
        },
        profilePhoto: uploadedProfilePhoto,
        profilePhotoUrl: uploadedProfilePhoto,
        license: uploadedLicense,
        licenseUrl: uploadedLicense,
        licenseName: licenseName || undefined,
        ownerIdFront: uploadedOwnerIdFront,
        ownerIdBack: uploadedOwnerIdBack,
        ownerIdFrontName: ownerIdFrontName || undefined,
        ownerIdBackName: ownerIdBackName || undefined,
      };

      updateProfile.mutate(payload, {
        onSuccess: () => {
          Alert.alert("Profile Updated", "Pharmacy profile saved.", [
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
            Edit Pharmacy Profile
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
                  borderRadius: 16,
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
            label="Pharmacy Name"
            value={formData.pharmacyName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, pharmacyName: value }))
            }
            required
          />
          <Input
            label="Pharmacy Type"
            value={formData.pharmacyType}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, pharmacyType: value }))
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
            label="Owner Name"
            value={formData.ownerName}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, ownerName: value }))
            }
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Owner Phone"
              value={formData.ownerPhone}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, ownerPhone: value }))
              }
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Owner Email"
              value={formData.ownerEmail}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, ownerEmail: value }))
              }
              keyboardType="email-address"
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
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
              label="Town/City"
              value={formData.townCity}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, townCity: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <Input
            label="Operating Hours"
            value={formData.operatingHours}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, operatingHours: value }))
            }
            required
          />
          <Input
            label="Off Days (comma separated)"
            value={formData.offDays}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, offDays: value }))
            }
            required
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Delivery Available"
              value={formData.deliveryAvailable}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, deliveryAvailable: value }))
              }
              placeholder="true or false"
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Delivery Fee"
              value={formData.deliveryFee}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, deliveryFee: value }))
              }
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input
              label="Pharmacist in Charge Name"
              value={formData.pharmacistInChargeName}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, pharmacistInChargeName: value }))
              }
              containerStyle={{ flex: 1 }}
              required
            />
            <Input
              label="Pharmacist in Charge Phone"
              value={formData.pharmacistInChargePhone}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, pharmacistInChargePhone: value }))
              }
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
              required
            />
          </View>
          <Input
            label="Pharmacist in Charge Email"
            value={formData.pharmacistInChargeEmail}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, pharmacistInChargeEmail: value }))
            }
            keyboardType="email-address"
            required
          />
          <Input
            label="Payment Method(s)"
            value={formData.paymentMethod}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, paymentMethod: value }))
            }
            placeholder="IntaSend"
            required
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
          <Input
            label="Address"
            value={formData.address}
            onChangeText={(value) =>
              setFormData((prev) => ({ ...prev, address: value }))
            }
            required
          />

          <LocationPickerField
            title="Pharmacy Location"
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
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
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
                onPress={() => handleDocumentPick(setOwnerIdFront, setOwnerIdFrontName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {ownerIdFrontName || (ownerIdFront ? "Owner ID Front selected" : "Upload Owner ID Front")}
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
                onPress={() => handleDocumentPick(setOwnerIdBack, setOwnerIdBackName)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {ownerIdBackName || (ownerIdBack ? "Owner ID Back selected" : "Upload Owner ID Back")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="Save Pharmacy Profile"
            onPress={handleSave}
            loading={updateProfile.isLoading}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
