import { create } from "zustand";

const DEFAULT_CONTACT = {
  email: "support@medilink.co.ke",
  phone: "+254 700 000 000",
  address: "Nairobi, Kenya",
  website: "",
  whatsapp: "",
};

export const useAppSettingsStore = create((set) => ({
  contact: DEFAULT_CONTACT,
  lastSyncedAt: null,
  setContact: (payload) =>
    set((state) => ({
      contact: { ...state.contact, ...(payload || {}) },
    })),
  setLastSyncedAt: (value) => set({ lastSyncedAt: value || null }),
}));

export const getAppContactSnapshot = () => {
  try {
    return useAppSettingsStore.getState().contact || DEFAULT_CONTACT;
  } catch {
    return DEFAULT_CONTACT;
  }
};

