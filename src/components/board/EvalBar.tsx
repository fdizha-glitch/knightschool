"use client";

import { useMemo } from "react";
import { evalToPercent, formatEval } from "@/lib/utils/chess-utils";
import type { Color } from "@/types";

interface EvalBarProps {
  evaluation: number; // centipawns, positive = white advantage
  mate: number | null;
  orientation?: Color;
  className?: string;
}

export function EvalBar({
  evaluation,
  mate,
  orientation = "white",
  className = "",
}: EvalBarProps) {
  const percent = useMemo(
    // Mates are folded into `evaluation` (±MATE_CP), so its sign is reliable
    // even for mate 0, where `mate` alone can't say who won.
    () => (mate !== null ? (evaluation > 0 ? 100 : 0) : evalToPercent(evaluation)),
    [evaluation, mate]
  );

  // From white's perspective: percent = white's share of the bar
  const whiteHeight = orientation === "white" ? percent : 100 - percent;

  const evalText = useMemo(
    () => formatEval(evaluation, mate, "w"),
    [evaluation, mate]
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Bar */}
      <div className="w-4 h-full min-h-[300px] max-h-[600px] rounded-full bg-zinc-800 dark:bg-zinc-950 overflow-hidden relative">
        {/* Black half — always fills from top */}
        <div
          className="w-full bg-zinc-900 dark:bg-zinc-950 absolute top-0 transition-all duration-300 ease-out"
          style={{ height: `${100 - whiteHeight}%` }}
        />
        {/* White half — fills from bottom */}
        <div
          className="w-full bg-zinc-100 dark:bg-zinc-200 absolute bottom-0 transition-all duration-300 ease-out"
          style={{ height: `${whiteHeight}%` }}
        />
        {/* Center line */}
        <div className="absolute left-0 right-0 h-px bg-zinc-500/50 top-1/2" />
      </div>

      {/* Label */}
      <div
        className={`mt-1 text-xs font-mono font-semibold tabular-nums ${
          evaluation > 0
            ? "text-zinc-100 dark:text-zinc-200"
            : evaluation < 0
              ? "text-zinc-400 dark:text-zinc-500"
              : "text-zinc-500"
        }`}
      >
        {evalText}
      </div>
    </div>
  );
}
