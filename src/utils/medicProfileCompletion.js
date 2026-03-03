export const medicProfileFields = [
  {
    key: "createdAt",
    label: "Created at",
    isComplete: (profile) => Boolean(profile?.createdAt),
  },
  {
    key: "firstName",
    label: "First name",
    isComplete: (profile) => Boolean(profile?.firstName?.trim()),
  },
  {
    key: "lastName",
    label: "Last name",
    isComplete: (profile) => Boolean(profile?.lastName?.trim()),
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
    key: "dateOfBirth",
    label: "Date of birth",
    isComplete: (profile) => Boolean(profile?.dateOfBirth),
  },
  {
    key: "gender",
    label: "Gender",
    isComplete: (profile) => Boolean(profile?.gender?.trim()),
  },
  {
    key: "professionalType",
    label: "Professional type",
    isComplete: (profile) => Boolean(profile?.professionalType?.trim()),
  },
  {
    key: "specialization",
    label: "Specialization",
    isComplete: (profile) => Boolean(profile?.specialization?.trim()),
  },
  {
    key: "licenseNumber",
    label: "License number",
    isComplete: (profile) => Boolean(profile?.licenseNumber?.trim()),
  },
  {
    key: "experienceYears",
    label: "Experience years",
    isComplete: (profile) =>
      profile?.experienceYears !== null &&
      profile?.experienceYears !== undefined &&
      `${profile.experienceYears}`.trim() !== "",
  },
  {
    key: "consultationFee",
    label: "Consultation fee",
    isComplete: (profile) =>
      profile?.consultationFee !== null &&
      profile?.consultationFee !== undefined &&
      `${profile.consultationFee}`.trim() !== "",
  },
  {
    key: "license",
    label: "Medical license",
    isComplete: (profile) => Boolean(profile?.licenseUrl || profile?.license),
  },
  {
    key: "idFront",
    label: "ID front",
    isComplete: (profile) => Boolean(profile?.idFront || profile?.idFrontUrl),
  },
  {
    key: "idBack",
    label: "ID back",
    isComplete: (profile) => Boolean(profile?.idBack || profile?.idBackUrl),
  },
  {
    key: "institution",
    label: "Institution",
    isComplete: (profile) => Boolean(profile?.institution?.trim()),
  },
  {
    key: "qualifications",
    label: "Qualifications",
    isComplete: (profile) => Boolean(profile?.qualifications?.trim()),
  },
  {
    key: "yearCompleted",
    label: "Year completed",
    isComplete: (profile) => Boolean(`${profile?.yearCompleted ?? ""}`.trim()),
  },
  {
    key: "certifications",
    label: "Certifications",
    isComplete: (profile) => Boolean(profile?.certifications?.trim()),
  },
  {
    key: "availableCounties",
    label: "Available counties",
    isComplete: (profile) =>
      Array.isArray(profile?.availableCounties)
        ? profile.availableCounties.length > 0
        : Boolean(profile?.availableCounties?.trim()),
  },
  {
    key: "preferredShiftTypes",
    label: "Preferred shift types",
    isComplete: (profile) =>
      Array.isArray(profile?.preferredShiftTypes)
        ? profile.preferredShiftTypes.length > 0
        : Boolean(profile?.preferredShiftTypes?.trim()),
  },
  {
    key: "hourlyRate",
    label: "Hourly rate",
    isComplete: (profile) => Boolean(`${profile?.hourlyRate ?? ""}`.trim()),
  },
  {
    key: "modeOfTransport",
    label: "Mode of transport",
    isComplete: (profile) => Boolean(profile?.modeOfTransport?.trim()),
  },
  {
    key: "bankName",
    label: "Bank name",
    isComplete: (profile) => Boolean(profile?.bankName?.trim()),
  },
  {
    key: "bankAccountNumber",
    label: "Bank account number",
    isComplete: (profile) => Boolean(profile?.bankAccountNumber?.trim()),
  },
  {
    key: "bankAccountName",
    label: "Bank account name",
    isComplete: (profile) => Boolean(profile?.bankAccountName?.trim()),
  },
  {
    key: "cv",
    label: "CV upload",
    isComplete: (profile) => Boolean(profile?.cvUrl || profile?.cv),
  },
  {
    key: "profilePhoto",
    label: "Profile photo",
    isComplete: (profile) =>
      Boolean(profile?.profilePhoto) ||
      Boolean(profile?.avatarUrl) ||
      Boolean(profile?.photoUrl),
  },
];

export const getMedicProfileCompletion = (profile) => {
  const total = medicProfileFields.length;
  const completed = medicProfileFields.filter((field) =>
    field.isComplete(profile),
  ).length;
  const percent = Math.round((completed / total) * 100);
  const missingFields = medicProfileFields
    .filter((field) => !field.isComplete(profile))
    .map((field) => field.label);

  return { percent, completed, total, missingFields };
};
