import { create } from "zustand";

export const useAdminContextStore = create((set) => ({
  selectedPharmacyTenantId: null,
  selectedMedicUserId: null,
  setSelectedPharmacyTenantId: (tenantId) =>
    set({ selectedPharmacyTenantId: tenantId || null }),
  setSelectedMedicUserId: (userId) =>
    set({ selectedMedicUserId: userId || null }),
  clearAdminContext: () =>
    set({ selectedPharmacyTenantId: null, selectedMedicUserId: null }),
}));
