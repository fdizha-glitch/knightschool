"use client";

import { useCallback, useRef, useState } from "react";
import type { EngineAnalysis } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { analyzePosition } from "@/lib/stockfish/engine";

interface StockfishHook {
  /** Analyse `fen` (default: the current board). Resolves with the analysis,
   *  or null if a newer analysis superseded this one. */
  analyze: (fen?: string) => Promise<EngineAnalysis | null>;
  isAnalyzing: boolean;
  error: string | null;
}

export function useStockfish(): StockfishHook {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const setAnalysis = useGameStore((s) => s.setAnalysis);
  const setThinking = useGameStore((s) => s.setThinking);
  const engineDepth = useSettingsStore((s) => s.settings.engineDepth);
  const engineLines = useSettingsStore((s) => s.settings.engineLines);

  const analyze = useCallback(
    async (overrideFen?: string): Promise<EngineAnalysis | null> => {
      // Read the board at call time — a value captured at render time can be
      // a move behind when this is called straight after a move.
      const targetFen = overrideFen ?? useGameStore.getState().fen;
      if (!targetFen) return null;

      const requestId = ++requestRef.current;
      setIsAnalyzing(true);
      setThinking(true);
      setError(null);

      try {
        const analysis = await analyzePosition(
          targetFen,
          engineDepth,
          engineLines
        );
        if (requestId !== requestRef.current) return null;

        // Only show it if the board still shows the analysed position.
        if (useGameStore.getState().fen === targetFen) setAnalysis(analysis);
        if (analysis.source === "fallback") {
          setError("Stockfish could not load — using basic analysis.");
        }
        return analysis;
      } catch (err: unknown) {
        if (requestId !== requestRef.current) return null;
        setError(err instanceof Error ? err.message : "Engine analysis failed");
        console.error("Stockfish hook error:", err);
        return null;
      } finally {
        if (requestId === requestRef.current) {
          setIsAnalyzing(false);
          setThinking(false);
        }
      }
    },
    [engineDepth, engineLines, setAnalysis, setThinking]
  );

  return { analyze, isAnalyzing, error };
}
