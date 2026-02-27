"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UserProgress,
  MistakeRecord,
  OpeningProgress,
  TrainingMode,
} from "@/types";
import { nanoid } from "./nanoid";

interface ProgressStore {
  progress: UserProgress;

  // Actions
  recordMove: (mode: TrainingMode) => void;
  recordMistake: (
    data: Omit<MistakeRecord, "id" | "timestamp" | "reviewed">
  ) => void;
  markMistakeReviewed: (id: string) => void;
  updateOpeningProgress: (openingId: string, correct: boolean) => void;
  addTacticsScore: (points: number) => void;
  addEndgameScore: (points: number) => void;
  bumpStreak: () => void;
  resetStreak: () => void;
  clearMistakes: () => void;
}

const DEFAULT_PROGRESS: UserProgress = {
  totalMoves: 0,
  totalSessions: 0,
  dailyStreak: 0,
  lastSessionDate: "",
  openingProgress: {},
  tacticsScore: 0,
  endgameScore: 0,
  mistakes: [],
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: DEFAULT_PROGRESS,

      recordMove: (mode) => {
        const today = new Date().toISOString().split("T")[0];
        set((state) => {
          const prev = state.progress;
          const isNewDay = prev.lastSessionDate !== today;
          return {
            progress: {
              ...prev,
              totalMoves: prev.totalMoves + 1,
              totalSessions: isNewDay
                ? prev.totalSessions + 1
                : prev.totalSessions,
              lastSessionDate: today,
              dailyStreak: isNewDay
                ? isConsecutiveDay(prev.lastSessionDate, today)
                  ? prev.dailyStreak + 1
                  : 1
                : prev.dailyStreak,
            },
          };
        });
      },

      recordMistake: (data) => {
        const mistake: MistakeRecord = {
          ...data,
          id: nanoid(),
          timestamp: Date.now(),
          reviewed: false,
        };
        set((state) => ({
          progress: {
            ...state.progress,
            mistakes: [mistake, ...state.progress.mistakes].slice(0, 100),
          },
        }));
      },

      markMistakeReviewed: (id) => {
        set((state) => ({
          progress: {
            ...state.progress,
            mistakes: state.progress.mistakes.map((m) =>
              m.id === id ? { ...m, reviewed: true } : m
            ),
          },
        }));
      },

      updateOpeningProgress: (openingId, correct) => {
        set((state) => {
          const prev = state.progress.openingProgress[openingId] ?? {
            openingId,
            correct: 0,
            total: 0,
            streak: 0,
            lastSeen: 0,
          };
          const updated: OpeningProgress = {
            openingId,
            correct: prev.correct + (correct ? 1 : 0),
            total: prev.total + 1,
            streak: correct ? prev.streak + 1 : 0,
            lastSeen: Date.now(),
          };
          return {
            progress: {
              ...state.progress,
              openingProgress: {
                ...state.progress.openingProgress,
                [openingId]: updated,
              },
            },
          };
        });
      },

      addTacticsScore: (points) => {
        set((state) => ({
          progress: {
            ...state.progress,
            tacticsScore: state.progress.tacticsScore + points,
          },
        }));
      },

      addEndgameScore: (points) => {
        set((state) => ({
          progress: {
            ...state.progress,
            endgameScore: state.progress.endgameScore + points,
          },
        }));
      },

      bumpStreak: () => {
        set((state) => ({
          progress: {
            ...state.progress,
            dailyStreak: state.progress.dailyStreak + 1,
          },
        }));
      },

      resetStreak: () => {
        set((state) => ({
          progress: { ...state.progress, dailyStreak: 0 },
        }));
      },

      clearMistakes: () => {
        set((state) => ({
          progress: { ...state.progress, mistakes: [] },
        }));
      },
    }),
    {
      name: "knightschool-progress",
    }
  )
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function isConsecutiveDay(prev: string, today: string): boolean {
  if (!prev) return false;
  const d1 = new Date(prev);
  const d2 = new Date(today);
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff) === 1;
}
