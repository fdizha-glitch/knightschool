"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineAnalysis, MiddlegamePosition, MoveQuality } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useProgressStore } from "@/lib/store/progress-store";
import { useStockfish } from "@/hooks/useStockfish";
import {
  classifyMoveQuality,
  moveQualityColor,
  moveQualityEmoji,
  uciToSan,
} from "@/lib/utils/chess-utils";
import { ChessBoard } from "@/components/board/ChessBoard";
import { MoveHistory } from "@/components/board/MoveHistory";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface MiddlegameTrainerProps {
  position: MiddlegamePosition;
  onNext?: () => void;
}

type Phase = "study" | "thinking" | "solved" | "reviewing";

export function MiddlegameTrainer({ position, onNext }: MiddlegameTrainerProps) {
  const {
    loadFen,
    setOrientation,
    setMode,
    setCurrentPositionId,
    setAnalysis,
    history,
    addCoachMessage,
  } = useGameStore();
  const { recordMistake, addTacticsScore } = useProgressStore();
  const { analyze } = useStockfish();

  const [phase, setPhase] = useState<Phase>("study");
  const [moveFeedback, setMoveFeedback] = useState<{
    quality: ReturnType<typeof classifyMoveQuality>;
    san: string;
    isBest: boolean;
  } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  // Engine analysis of the puzzle's starting position
  const startAnalysisRef = useRef<EngineAnalysis | null>(null);

  // ── Setup ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadFen(position.fen);
    setOrientation(position.sideToMove);
    setMode("middlegame");
    setCurrentPositionId(position.id);
    setPhase("study");
    setMoveFeedback(null);
    setHintsUsed(0);
    setAttempts(0);
    setShowSolution(false);
    startAnalysisRef.current = null;

    let cancelled = false;
    analyze(position.fen).then((a) => {
      if (!cancelled && a) startAnalysisRef.current = a;
    });
    return () => {
      cancelled = true;
    };
  }, [position, analyze, loadFen, setOrientation, setMode, setCurrentPositionId]);

  // ── Move Handler ──────────────────────────────────────────────────────────

  const handleMovePlayed = useCallback(
    async (san: string) => {
      if (phase !== "study") return;
      setPhase("thinking"); // lock the board while we analyse
      setAttempts((a) => a + 1);

      const fenAfterMove = useGameStore.getState().fen;
      const before =
        startAnalysisRef.current ?? (await analyze(position.fen));
      if (before) startAnalysisRef.current = before;
      const after = await analyze(fenAfterMove);

      const engineBestSan =
        before && before.source === "stockfish" && before.bestMove !== "(none)"
          ? uciToSan(position.fen, before.bestMove)
          : null;
      const isBest =
        position.bestMoves.includes(san) || san === engineBestSan;

      // Evaluations are from White's view; flip so loss is from the mover's.
      let quality: MoveQuality;
      if (before?.source === "stockfish" && after?.source === "stockfish") {
        const sign = position.sideToMove === "white" ? 1 : -1;
        const evalLoss = Math.max(0, (before.evaluation - after.evaluation) * sign);
        quality = classifyMoveQuality(evalLoss);
      } else {
        // Without the engine we can only check against the stored answers.
        quality = isBest ? "excellent" : "mistake";
      }

      setMoveFeedback({ quality, san, isBest });

      if (isBest || quality === "excellent" || quality === "good") {
        // Full points only for a first-try solve without hints
        const points = attempts === 0 && hintsUsed === 0 ? 10 : 5;
        addTacticsScore(points);
        setPointsEarned(points);
        setPhase("solved");
        addCoachMessage({
          type: quality === "excellent" || isBest ? "praise" : "feedback",
          content: isBest
            ? `${moveQualityEmoji("excellent")} Excellent! **${san}** is the best move!`
            : `${moveQualityEmoji(quality)} **${san}** is a good move!`,
          detail: position.explanation,
          principle: position.hints[0],
        });
      } else {
        if (quality === "blunder" || quality === "mistake") {
          recordMistake({
            fen: position.fen,
            movePlayed: san,
            bestMove: position.bestMoves[0] ?? engineBestSan ?? "",
            evaluation: after?.evaluation ?? 0,
            mode: "middlegame",
            theme: position.theme[0],
            explanation: position.explanation,
          });
        }
        addCoachMessage({
          type: quality === "blunder" ? "mistake" : "feedback",
          content: `${moveQualityEmoji(quality)} **${san}** — ${quality}. Try again!`,
          detail: `The theme here is ${position.theme.join(", ")}. ${position.hints[0] ?? ""}`,
        });
        setPhase("reviewing");
      }
    },
    [phase, position, attempts, hintsUsed, analyze, addCoachMessage, addTacticsScore, recordMistake]
  );

  function handleTryAgain() {
    loadFen(position.fen);
    if (startAnalysisRef.current) setAnalysis(startAnalysisRef.current);
    setPhase("study");
    setMoveFeedback(null);
  }

  function handleHint() {
    const hint = position.hints[hintsUsed] ?? position.hints.at(-1);
    if (hint) {
      addCoachMessage({ type: "hint", content: hint });
      setHintsUsed((h) => h + 1);
    }
  }

  function handleShowSolution() {
    setShowSolution(true);
    addCoachMessage({
      type: "feedback",
      content: `Solution: **${position.bestMoves.join(", ")}**`,
      detail: position.explanation,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      {/* Board column */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
              {position.title}
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {position.theme.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand dark:text-brand-light font-medium"
                >
                  {t}
                </span>
              ))}
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                {position.difficulty}
              </span>
            </div>
          </div>
          {onNext && (
            <Button variant="ghost" size="sm" onClick={onNext}>
              Skip →
            </Button>
          )}
        </div>

        <ChessBoard
          interactive={phase === "study"}
          allowedColor={position.sideToMove}
          onMovePlayed={handleMovePlayed}
        />

        {/* Move feedback */}
        {moveFeedback && (
          <div
            className={`rounded-xl px-4 py-3 animate-slide-in flex items-center justify-between ${
              moveFeedback.isBest ||
              moveFeedback.quality === "excellent" ||
              moveFeedback.quality === "good"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30"
                : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30"
            }`}
          >
            <span
              className={`text-sm font-semibold ${moveQualityColor(moveFeedback.quality)}`}
            >
              {moveQualityEmoji(moveFeedback.quality)}{" "}
              {moveFeedback.san} —{" "}
              {moveFeedback.isBest ? "Best move!" : moveFeedback.quality}
            </span>
            {phase === "reviewing" && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleTryAgain}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        {/* Solved banner */}
        {phase === "solved" && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300/30 p-4 animate-slide-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  Position solved! +{pointsEarned} pts
                </p>
                {attempts > 1 && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Solved in {attempts} attempt{attempts !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {onNext && (
                <Button variant="primary" size="sm" onClick={onNext}>
                  Next →
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action row */}
        {phase === "study" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHint}
              disabled={hintsUsed >= position.hints.length}
              icon={<span>🔍</span>}
            >
              Hint {hintsUsed > 0 ? `(${hintsUsed}/${position.hints.length})` : ""}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowSolution}
              icon={<span>💡</span>}
            >
              Show solution
            </Button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-3">
        <Card title="Position Description">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {position.description}
          </p>
          {showSolution && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Explanation
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {position.explanation}
              </p>
            </div>
          )}
        </Card>

        <Card title="Move History">
          <MoveHistory history={history} />
        </Card>

        <CoachPanel />
      </div>
    </div>
  );
}
