"use client";

import { useCallback, useRef, useState } from "react";
import type { EngineAnalysis } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";

interface StockfishHook {
  analyze: (fen?: string) => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
}

export function useStockfish(): StockfishHook {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { fen, setAnalysis, setThinking } = useGameStore();
  const { settings } = useSettingsStore();

  const analyze = useCallback(
    async (overrideFen?: string) => {
      const targetFen = overrideFen ?? fen;
      if (!targetFen) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsAnalyzing(true);
      setThinking(true);
      setError(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: targetFen,
            depth: settings.engineDepth,
            multiPV: settings.engineLines,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Analysis failed");
        }

        const analysis: EngineAnalysis = await res.json();
        setAnalysis(analysis);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Engine analysis failed";
        setError(msg);
        console.error("Stockfish hook error:", err);
      } finally {
        setIsAnalyzing(false);
        setThinking(false);
      }
    },
    [fen, settings.engineDepth, settings.engineLines, setAnalysis, setThinking]
  );

  return { analyze, isAnalyzing, error };
}
