export const pharmacyProfileFields = [
  {
    key: "createdAt",
    label: "Created at",
    isComplete: (profile) => Boolean(profile?.createdAt),
  },
  {
    key: "pharmacyName",
    label: "Pharmacy name",
    isComplete: (profile) => Boolean(profile?.pharmacyName?.trim()),
  },
  {
    key: "pharmacyType",
    label: "Pharmacy type",
    isComplete: (profile) => Boolean(profile?.pharmacyType?.trim()),
  },
  {
    key: "registrationNumber",
    label: "Registration number",
    isComplete: (profile) => Boolean(profile?.registrationNumber?.trim()),
  },
  {
    key: "adminName",
    label: "Admin name",
    isComplete: (profile) =>
      Boolean(profile?.adminName?.trim()) ||
      Boolean(profile?.firstName?.trim() && profile?.lastName?.trim()),
  },
  {
    key: "ownerName",
    label: "Owner name",
    isComplete: (profile) => Boolean(profile?.ownerName?.trim()),
  },
  {
    key: "ownerPhone",
    label: "Owner phone",
    isComplete: (profile) => Boolean(profile?.ownerPhone?.trim()),
  },
  {
    key: "ownerEmail",
    label: "Owner email",
    isComplete: (profile) => Boolean(profile?.ownerEmail?.trim()),
  },
  {
    key: "email",
    label: "Email",
    isComplete: (profile) => Boolean(profile?.email?.trim()),
  },
  {
    key: "phone",
    label: "Phone",
    isComplete: (profile) => Boolean(profile?.phone?.trim()),
  },
  {
    key: "location",
    label: "Pharmacy location",
    isComplete: (profile) =>
      Boolean(profile?.location?.lat && profile?.location?.lng) ||
      Boolean(profile?.location?.address) ||
      Boolean(profile?.address?.trim()),
  },
  {
    key: "county",
    label: "County",
    isComplete: (profile) => Boolean(profile?.county?.trim()),
  },
  {
    key: "townCity",
    label: "Town/City",
    isComplete: (profile) => Boolean(profile?.townCity?.trim()),
  },
  {
    key: "operatingHours",
    label: "Operating hours",
    isComplete: (profile) => Boolean(profile?.operatingHours?.trim()),
  },
  {
    key: "offDays",
    label: "Off days",
    isComplete: (profile) =>
      Array.isArray(profile?.offDays)
        ? profile.offDays.length > 0
        : Boolean(profile?.offDays?.trim()),
  },
  {
    key: "deliveryAvailable",
    label: "Delivery available",
    isComplete: (profile) => typeof profile?.deliveryAvailable === "boolean",
  },
  {
    key: "deliveryFee",
    label: "Delivery fee",
    isComplete: (profile) =>
      profile?.deliveryAvailable === false ||
      (profile?.deliveryAvailable === true &&
        Boolean(`${profile?.deliveryFee ?? ""}`.trim())),
  },
  {
    key: "pharmacistInChargeName",
    label: "Pharmacist in charge name",
    isComplete: (profile) => Boolean(profile?.pharmacistInChargeName?.trim()),
  },
  {
    key: "pharmacistInChargePhone",
    label: "Pharmacist in charge phone",
    isComplete: (profile) => Boolean(profile?.pharmacistInChargePhone?.trim()),
  },
  {
    key: "pharmacistInChargeEmail",
    label: "Pharmacist in charge email",
    isComplete: (profile) => Boolean(profile?.pharmacistInChargeEmail?.trim()),
  },
  {
    key: "paymentMethod",
    label: "Payment method",
    isComplete: (profile) =>
      Array.isArray(profile?.paymentMethod)
        ? profile.paymentMethod.length > 0
        : Boolean(profile?.paymentMethod?.trim()),
  },
  {
    key: "license",
    label: "Pharmacy license",
    isComplete: (profile) => Boolean(profile?.licenseUrl || profile?.license),
  },
  {
    key: "ownerIdFront",
    label: "Owner ID front",
    isComplete: (profile) =>
      Boolean(profile?.ownerIdFront || profile?.ownerIdFrontUrl),
  },
  {
    key: "ownerIdBack",
    label: "Owner ID back",
    isComplete: (profile) =>
      Boolean(profile?.ownerIdBack || profile?.ownerIdBackUrl),
  },
  {
    key: "adminId",
    label: "Admin ID",
    isComplete: (profile) => Boolean(profile?.adminIdUrl || profile?.adminId),
  },
  {
    key: "profilePhoto",
    label: "Profile photo",
    isComplete: (profile) =>
      Boolean(profile?.profilePhoto) || Boolean(profile?.photoUrl),
  },
];

export const getPharmacyProfileCompletion = (profile) => {
  const total = pharmacyProfileFields.length;
  const completed = pharmacyProfileFields.filter((field) =>
    field.isComplete(profile),
  ).length;
  const percent = Math.round((completed / total) * 100);
  const missingFields = pharmacyProfileFields
    .filter((field) => !field.isComplete(profile))
    .map((field) => field.label);

  return { percent, completed, total, missingFields };
};
