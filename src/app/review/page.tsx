"use client";

import { useState } from "react";
import { useProgressStore } from "@/lib/store/progress-store";
import { useGameStore } from "@/lib/store/game-store";
import type { MistakeRecord } from "@/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { StatsPanel } from "@/components/progress/StatsPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ReviewPage() {
  const { progress, markMistakeReviewed, clearMistakes } = useProgressStore();
  const { loadFen, setMode } = useGameStore();
  const [selected, setSelected] = useState<MistakeRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "unreviewed">("unreviewed");

  const mistakes =
    filter === "unreviewed"
      ? progress.mistakes.filter((m) => !m.reviewed)
      : progress.mistakes;

  function openMistake(m: MistakeRecord) {
    setSelected(m);
    loadFen(m.fen);
    setMode(m.mode);
  }

  function handleMarkReviewed(id: string) {
    markMistakeReviewed(id);
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Review
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Revisit your mistakes and fix the patterns.
        </p>
      </div>

      {/* Stats */}
      <StatsPanel />

      {selected ? (
        /* ── Mistake replay view ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selected.theme ? `Mistake: ${selected.theme}` : "Mistake"}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {selected.mode} ·{" "}
                  {new Date(selected.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleMarkReviewed(selected.id)}
                >
                  Mark reviewed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(null)}
                >
                  ← Back
                </Button>
              </div>
            </div>

            <ChessBoard interactive={false} />

            <Card>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-3">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">
                      You played
                    </p>
                    <p className="font-mono font-bold text-lg text-red-700 dark:text-red-400">
                      {selected.movePlayed}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-3">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
                      Best move
                    </p>
                    <p className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-400">
                      {selected.bestMove}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selected.explanation}
                </p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <CoachPanel />
          </div>
        </div>
      ) : (
        /* ── Mistakes list ─────────────────────────────────────────────────── */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              {(["unreviewed", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                    filter === f
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {f === "unreviewed"
                    ? `To review (${progress.mistakes.filter((m) => !m.reviewed).length})`
                    : `All (${progress.mistakes.length})`}
                </button>
              ))}
            </div>
            {progress.mistakes.length > 0 && (
              <Button
                variant="danger"
                size="xs"
                onClick={() => {
                  if (confirm("Clear all mistakes? This cannot be undone."))
                    clearMistakes();
                }}
              >
                Clear all
              </Button>
            )}
          </div>

          {mistakes.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">
                {filter === "unreviewed"
                  ? "No unreviewed mistakes!"
                  : "No mistakes recorded yet."}
              </p>
              <p className="text-sm mt-1">
                Keep training to build your mistake library.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {mistakes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMistake(m)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    m.reviewed
                      ? "border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-80"
                      : "border-red-200 dark:border-red-800/40 hover:border-red-400/60 bg-red-50/30 dark:bg-red-950/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {m.mode}
                      {m.theme ? ` · ${m.theme}` : ""}
                    </span>
                    {m.reviewed && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                        ✓ reviewed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-sm text-red-600 dark:text-red-400">
                      {m.movePlayed}
                    </span>
                    <span className="text-zinc-400 text-xs">→</span>
                    <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      {m.bestMove}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1.5 line-clamp-2">
                    {m.explanation}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1.5">
                    {new Date(m.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
