export const profileCompletionFields = [
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
    isComplete: (profile) => Boolean(profile?.gender),
  },
  {
    key: "homeCountry",
    label: "Home country",
    isComplete: (profile) => Boolean(profile?.homeCountry?.trim()),
  },
  {
    key: "subCounty",
    label: "Sub county",
    isComplete: (profile) => Boolean(profile?.subCounty?.trim()),
  },
  {
    key: "ward",
    label: "Ward",
    isComplete: (profile) => Boolean(profile?.ward?.trim()),
  },
  {
    key: "emergencyContactName",
    label: "Emergency contact name",
    isComplete: (profile) => Boolean(profile?.emergencyContactName?.trim()),
  },
  {
    key: "emergencyContactPhone",
    label: "Emergency contact phone",
    isComplete: (profile) => Boolean(profile?.emergencyContactPhone?.trim()),
  },
  {
    key: "emergencyContactRelationship",
    label: "Emergency contact relationship",
    isComplete: (profile) =>
      Boolean(profile?.emergencyContactRelationship?.trim()),
  },
  {
    key: "preferredLanguage",
    label: "Preferred language",
    isComplete: (profile) => Boolean(profile?.preferredLanguage?.trim()),
  },
  {
    key: "address",
    label: "Address",
    isComplete: (profile) => Boolean(profile?.address?.trim()),
  },
  {
    key: "location",
    label: "Location",
    isComplete: (profile) =>
      Boolean(profile?.location?.lat && profile?.location?.lng) ||
      Boolean(profile?.location?.address) ||
      Boolean(profile?.locationAddress?.trim()),
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

export const getProfileCompletion = (profile) => {
  const total = profileCompletionFields.length;
  const completed = profileCompletionFields.filter((field) =>
    field.isComplete(profile),
  ).length;
  const percent = Math.round((completed / total) * 100);
  const missingFields = profileCompletionFields
    .filter((field) => !field.isComplete(profile))
    .map((field) => field.label);

  return { percent, completed, total, missingFields };
};
