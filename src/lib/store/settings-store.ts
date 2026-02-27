"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  defaultColor: "white",
  engineDepth: 15,
  engineLines: 3,
  voiceEnabled: true,
  ttsEnabled: false,
  showEvalBar: true,
  showBestMove: false, // off by default — encourage thinking
  animationSpeed: 200,
  boardTheme: "classic",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: "knightschool-settings" }
  )
);
