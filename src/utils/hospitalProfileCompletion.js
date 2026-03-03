export const hospitalProfileFields = [
  {
    key: "createdAt",
    label: "Created at",
    isComplete: (profile) => Boolean(profile?.createdAt),
  },
  {
    key: "hospitalName",
    label: "Hospital name",
    isComplete: (profile) => Boolean(profile?.hospitalName?.trim()),
  },
  {
    key: "facilityType",
    label: "Facility type",
    isComplete: (profile) => Boolean(profile?.facilityType?.trim()),
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
    key: "adminContact",
    label: "Admin contact",
    isComplete: (profile) => Boolean(profile?.adminContact?.trim() || profile?.phone?.trim()),
  },
  {
    key: "adminEmail",
    label: "Admin email",
    isComplete: (profile) => Boolean(profile?.adminEmail?.trim() || profile?.email?.trim()),
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
    label: "Hospital location",
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
    key: "subCounty",
    label: "Sub county",
    isComplete: (profile) => Boolean(profile?.subCounty?.trim()),
  },
  {
    key: "nearestTown",
    label: "Nearest town",
    isComplete: (profile) => Boolean(profile?.nearestTown?.trim()),
  },
  {
    key: "managerName",
    label: "Manager name",
    isComplete: (profile) => Boolean(profile?.managerName?.trim()),
  },
  {
    key: "managerPhone",
    label: "Manager phone",
    isComplete: (profile) => Boolean(profile?.managerPhone?.trim()),
  },
  {
    key: "bedCapacity",
    label: "Bed capacity",
    isComplete: (profile) => Boolean(`${profile?.bedCapacity ?? ""}`.trim()),
  },
  {
    key: "specialties",
    label: "Specialties",
    isComplete: (profile) =>
      Array.isArray(profile?.specialties)
        ? profile.specialties.length > 0
        : Boolean(profile?.specialties?.trim()),
  },
  {
    key: "operatingHours",
    label: "Operating hours",
    isComplete: (profile) => Boolean(profile?.operatingHours?.trim()),
  },
  {
    key: "workingDays",
    label: "Working days",
    isComplete: (profile) =>
      Array.isArray(profile?.workingDays)
        ? profile.workingDays.length > 0
        : Boolean(profile?.workingDays?.trim()),
  },
  {
    key: "services",
    label: "Services offered",
    isComplete: (profile) =>
      Array.isArray(profile?.services)
        ? profile.services.length > 0
        : Boolean(profile?.services?.trim()),
  },
  {
    key: "paymentModes",
    label: "Payment modes",
    isComplete: (profile) =>
      Array.isArray(profile?.paymentModes)
        ? profile.paymentModes.length > 0
        : Boolean(profile?.paymentModes?.trim()),
  },
  {
    key: "patientVolume",
    label: "Approx. patient volume",
    isComplete: (profile) => Boolean(profile?.patientVolume),
  },
  {
    key: "license",
    label: "Hospital license",
    isComplete: (profile) => Boolean(profile?.licenseUrl || profile?.license),
  },
  {
    key: "adminId",
    label: "Admin ID",
    isComplete: (profile) => Boolean(profile?.adminIdUrl || profile?.adminId),
  },
  {
    key: "profilePhoto",
    label: "Hospital logo/photo",
    isComplete: (profile) =>
      Boolean(profile?.profilePhoto) || Boolean(profile?.photoUrl),
  },
];

export const getHospitalProfileCompletion = (profile) => {
  const total = hospitalProfileFields.length;
  const completed = hospitalProfileFields.filter((field) =>
    field.isComplete(profile),
  ).length;
  const percent = Math.round((completed / total) * 100);
  const missingFields = hospitalProfileFields
    .filter((field) => !field.isComplete(profile))
    .map((field) => field.label);

  return { percent, completed, total, missingFields };
};
