import { create } from "zustand";

/* Controls the registration overlay (solo + group). */
export const useRegisterStore = create((set) => ({
  isRegisterOpen: false,

  openRegister: () => set({ isRegisterOpen: true }),
  closeRegister: () => set({ isRegisterOpen: false }),
}));