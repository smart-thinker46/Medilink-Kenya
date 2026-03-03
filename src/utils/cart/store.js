import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const cartKey = "medilink-cart";

export const useCartStore = create((set, get) => ({
  items: [],
  isReady: false,
  setItems: async (items) => {
    const safeItems = Array.isArray(items) ? items : [];
    await SecureStore.setItemAsync(cartKey, JSON.stringify(safeItems));
    set({ items: safeItems, isReady: true });
  },
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(cartKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ items: Array.isArray(parsed) ? parsed : [], isReady: true });
      } else {
        set({ items: [], isReady: true });
      }
    } catch {
      set({ items: [], isReady: true });
    }
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(cartKey);
    set({ items: [] });
  },
  addItem: async (product) => {
    const items = get().items.slice();
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      existing.cartQuantity = (existing.cartQuantity || 0) + 1;
    } else {
      items.push({ ...product, cartQuantity: 1 });
    }
    await SecureStore.setItemAsync(cartKey, JSON.stringify(items));
    set({ items });
  },
  removeItem: async (productId) => {
    const items = get().items.slice();
    const existing = items.find((item) => item.id === productId);
    if (!existing) return;
    if ((existing.cartQuantity || 0) <= 1) {
      const next = items.filter((item) => item.id !== productId);
      await SecureStore.setItemAsync(cartKey, JSON.stringify(next));
      set({ items: next });
      return;
    }
    existing.cartQuantity -= 1;
    await SecureStore.setItemAsync(cartKey, JSON.stringify(items));
    set({ items });
  },
  setQuantity: async (productId, quantity) => {
    const items = get().items.slice();
    const existing = items.find((item) => item.id === productId);
    if (!existing) return;
    existing.cartQuantity = Math.max(1, Number(quantity) || 1);
    await SecureStore.setItemAsync(cartKey, JSON.stringify(items));
    set({ items });
  },
}));
