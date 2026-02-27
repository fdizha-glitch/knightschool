"use client";

import { useEffect, useState } from "react";
import type { Opening, OpeningBranch } from "@/types";
import { loadOpenings } from "@/lib/data/loader";
import { OpeningTrainer } from "@/components/training/OpeningTrainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Selection =
  | { type: "trunk"; opening: Opening }
  | { type: "branch"; opening: Opening; branch: OpeningBranch };

export default function OpeningsPage() {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [color, setColor] = useState<"white" | "black">("white");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpenings()
      .then(setOpenings)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-pulse-soft text-zinc-400">Loading openings…</div>
      </div>
    );
  }

  if (selection) {
    return (
      <div>
        <button
          onClick={() => setSelection(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          ← Back to openings
        </button>
        <OpeningTrainer
          key={
            selection.type === "branch"
              ? selection.branch.id
              : selection.opening.id
          }
          opening={selection.opening}
          branch={
            selection.type === "branch" ? selection.branch : undefined
          }
          playerColor={color}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Openings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Drill opening repertoires with spaced repetition coaching.
          </p>
        </div>

        {/* Side selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Play as:
          </span>
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(["white", "black"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                  color === c
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {c === "white" ? "♙ White" : "♟ Black"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {openings.map((opening) => (
        <Card key={opening.id} title={opening.name} subtitle={`ECO ${opening.eco} · ${opening.family}`}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {opening.description}
          </p>

          {/* Trunk drill */}
          <div className="mb-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelection({ type: "trunk", opening })}
            >
              Drill trunk moves ({opening.moves.length} moves)
            </Button>
          </div>

          {/* Branches */}
          {opening.branches.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                Variations
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {opening.branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() =>
                      setSelection({ type: "branch", opening, branch })
                    }
                    className="text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-brand/40 hover:bg-brand/5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {branch.name}
                      </span>
                      <div className="flex gap-1 ml-2">
                        {branch.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 line-clamp-2">
                      {branch.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
