"use client";

import { useCallback, useState } from "react";
import type { CoachMessage } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { speakText } from "@/lib/utils/audio";

interface CoachHook {
  isLoading: boolean;
  error: string | null;
  askCoach: (voiceInput?: string) => Promise<CoachMessage | null>;
  explainMove: (moveSAN: string) => Promise<CoachMessage | null>;
  getHint: () => Promise<CoachMessage | null>;
}

export function useCoach(): CoachHook {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fen, lastMoveSAN, lastAnalysis, previousEval, mode, addCoachMessage } =
    useGameStore();
  const { settings } = useSettingsStore();

  const fetchCoach = useCallback(
    async (payload: object): Promise<CoachMessage | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Coach request failed");
        }

        const msg: CoachMessage = await res.json();
        addCoachMessage(msg);

        if (settings.ttsEnabled && msg.content) {
          speakText(msg.content);
        }

        return msg;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Coach failed";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addCoachMessage, settings.ttsEnabled]
  );

  const askCoach = useCallback(
    (voiceInput?: string) =>
      fetchCoach({
        fen,
        lastMoveSAN,
        analysis: lastAnalysis,
        previousEval,
        voiceInput,
        mode,
      }),
    [fetchCoach, fen, lastMoveSAN, lastAnalysis, previousEval, mode]
  );

  const explainMove = useCallback(
    (moveSAN: string) =>
      fetchCoach({
        fen,
        lastMoveSAN: moveSAN,
        analysis: lastAnalysis,
        previousEval,
        voiceInput: `Why is ${moveSAN}?`,
        mode,
      }),
    [fetchCoach, fen, lastAnalysis, previousEval, mode]
  );

  const getHint = useCallback(
    () =>
      fetchCoach({
        fen,
        lastMoveSAN,
        analysis: lastAnalysis,
        previousEval,
        voiceInput: "Give me a hint",
        mode,
      }),
    [fetchCoach, fen, lastMoveSAN, lastAnalysis, previousEval, mode]
  );

  return { isLoading, error, askCoach, explainMove, getHint };
}
