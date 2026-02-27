"use client";

import { useEffect, useState } from "react";
import type { EndgamePosition, Difficulty } from "@/types";
import { loadEndgamePositions } from "@/lib/data/loader";
import { EndgameTrainer } from "@/components/training/EndgameTrainer";
import { Button } from "@/components/ui/Button";

const THEMES = [
  "all",
  "rook-endgame",
  "king-pawn",
  "minor-piece",
  "queen-endgame",
];

export default function EndgamesPage() {
  const [positions, setPositions] = useState<EndgamePosition[]>([]);
  const [filtered, setFiltered] = useState<EndgamePosition[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeTheme, setActiveTheme] = useState("all");
  const [activeDiff, setActiveDiff] = useState<Difficulty | "all">("all");
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEndgamePositions()
      .then((data) => {
        setPositions(data);
        setFiltered(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = positions;
    if (activeTheme !== "all") result = result.filter((p) => p.theme === activeTheme);
    if (activeDiff !== "all") result = result.filter((p) => p.difficulty === activeDiff);
    setFiltered(result);
    setCurrentIdx(0);
  }, [activeTheme, activeDiff, positions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-pulse-soft text-zinc-400">Loading endgames…</div>
      </div>
    );
  }

  if (training && filtered.length > 0) {
    const position = filtered[currentIdx % filtered.length];
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setTraining(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            ← Position list
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {(currentIdx % filtered.length) + 1} / {filtered.length}
          </span>
        </div>
        <EndgameTrainer
          key={position.id}
          position={position}
          onNext={() => setCurrentIdx((i) => i + 1)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Endgames
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Master key endgame positions — from king and pawn basics to rook technique.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Category
          </p>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTheme(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTheme === t
                    ? "bg-brand text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {t === "all" ? "All categories" : t.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Difficulty
          </p>
          <div className="flex gap-1.5">
            {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setActiveDiff(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  activeDiff === d
                    ? "bg-brand text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <Button variant="primary" size="lg" onClick={() => setTraining(true)}>
          Start Training ({filtered.length} position{filtered.length !== 1 ? "s" : ""})
        </Button>
      ) : (
        <p className="text-zinc-500 italic">No positions match the filters.</p>
      )}

      {/* Position grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((pos, idx) => (
          <button
            key={pos.id}
            onClick={() => { setCurrentIdx(idx); setTraining(true); }}
            className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-teal-400/40 hover:bg-teal-500/5 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                  {pos.title}
                </h3>
                {pos.theoryName && (
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                    {pos.theoryName}
                  </p>
                )}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${
                pos.difficulty === "beginner"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : pos.difficulty === "intermediate"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}>
                {pos.difficulty}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1.5 line-clamp-2">
              {pos.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {pos.theme.replace(/-/g, " ")}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                pos.objective === "win"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              }`}>
                {pos.objective}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
