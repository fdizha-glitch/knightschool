"use client";

import { useProgressStore } from "@/lib/store/progress-store";
import { Card, CardStat } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function StatsPanel({ className = "" }: { className?: string }) {
  const { progress } = useProgressStore();

  const totalOpeningMoves = Object.values(progress.openingProgress).reduce(
    (sum, p) => sum + p.total,
    0
  );
  const correctOpeningMoves = Object.values(progress.openingProgress).reduce(
    (sum, p) => sum + p.correct,
    0
  );
  const openingAccuracy =
    totalOpeningMoves > 0
      ? Math.round((correctOpeningMoves / totalOpeningMoves) * 100)
      : 0;

  const unreviewedMistakes = progress.mistakes.filter((m) => !m.reviewed).length;

  return (
    <Card title="Your Progress" className={className}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CardStat
          label="Daily Streak"
          value={`${progress.dailyStreak}d`}
          sub="consecutive days"
          color="purple"
        />
        <CardStat
          label="Total Moves"
          value={progress.totalMoves.toLocaleString()}
          sub="across all modes"
          color="blue"
        />
        <CardStat
          label="Opening Accuracy"
          value={`${openingAccuracy}%`}
          sub={`${correctOpeningMoves}/${totalOpeningMoves} moves`}
          color={openingAccuracy >= 80 ? "green" : openingAccuracy >= 60 ? "default" : "red"}
        />
        <CardStat
          label="Tactics Score"
          value={progress.tacticsScore}
          sub="puzzle points"
          color="green"
        />
      </div>

      {unreviewedMistakes > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
              {unreviewedMistakes} mistake{unreviewedMistakes !== 1 ? "s" : ""} to review
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Reviewing your errors is the fastest way to improve.
            </p>
          </div>
          <a
            href="/review"
            className="shrink-0 ml-3 text-sm font-medium text-orange-700 dark:text-orange-300 underline underline-offset-2"
          >
            Review →
          </a>
        </div>
      )}

      {/* Opening breakdown */}
      {Object.keys(progress.openingProgress).length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Opening Recall
          </h4>
          <div className="space-y-1.5">
            {Object.values(progress.openingProgress)
              .sort((a, b) => b.lastSeen - a.lastSeen)
              .slice(0, 5)
              .map((op) => {
                const acc =
                  op.total > 0 ? Math.round((op.correct / op.total) * 100) : 0;
                return (
                  <div key={op.openingId} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-28 truncate">
                      {op.openingId.replace(/-/g, " ")}
                    </span>
                    <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          acc >= 80
                            ? "bg-emerald-500"
                            : acc >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 w-8 text-right">
                      {acc}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </Card>
  );
}
