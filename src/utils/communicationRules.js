export const ROLE_CONTACT_MATRIX = {
  SUPER_ADMIN: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACY_ADMIN", "MEDIC", "PATIENT"],
  PATIENT: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACY_ADMIN", "MEDIC"],
  MEDIC: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACY_ADMIN", "PATIENT"],
  HOSPITAL_ADMIN: ["SUPER_ADMIN", "PHARMACY_ADMIN", "MEDIC", "PATIENT"],
  PHARMACY_ADMIN: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "MEDIC", "PATIENT"],
};

export const normalizeRole = (role) => (role || "").toUpperCase();

export const canContact = (senderRole, recipientRole) => {
  const from = normalizeRole(senderRole);
  const to = normalizeRole(recipientRole);
  if (!from || !to) return false;
  const allowed = ROLE_CONTACT_MATRIX[from] || [];
  return allowed.includes(to);
};
