"use client";

import { useCallback, useEffect, useState } from "react";
import { Chess } from "chess.js";
import type { EndgamePosition } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useProgressStore } from "@/lib/store/progress-store";
import { useStockfish } from "@/hooks/useStockfish";
import { uciToSan } from "@/lib/utils/chess-utils";
import { ChessBoard } from "@/components/board/ChessBoard";
import { MoveHistory } from "@/components/board/MoveHistory";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface EndgameTrainerProps {
  position: EndgamePosition;
  onNext?: () => void;
}

type EndgameResult = "win" | "draw" | "loss" | null;

export function EndgameTrainer({ position, onNext }: EndgameTrainerProps) {
  const {
    fen,
    loadFen,
    makeMove,
    setOrientation,
    setMode,
    setCurrentPositionId,
    addCoachMessage,
    history,
  } = useGameStore();
  const { addEndgameScore } = useProgressStore();
  const { analyze } = useStockfish();

  const [result, setResult] = useState<EndgameResult>(null);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [showTheory, setShowTheory] = useState(false);

  // ── Setup ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadFen(position.fen);
    setOrientation(position.sideToMove);
    setMode("endgames");
    setCurrentPositionId(position.id);
    setResult(null);
    setIsEngineThinking(false);
    setMoveCount(0);
    setShowTheory(false);

    // Get initial analysis
    setTimeout(() => analyze(position.fen), 200);
  }, [position.id]);

  // ── Check for game end ────────────────────────────────────────────────────

  useEffect(() => {
    if (result) return;
    const chess = new Chess(fen);

    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        // Who won?
        const winnerIsPlayer =
          (chess.turn() !== (position.sideToMove === "white" ? "w" : "b"));
        const r: EndgameResult = winnerIsPlayer ? "win" : "loss";
        setResult(r);
        if (r === "win") {
          addEndgameScore(10);
          addCoachMessage({
            type: "praise",
            content: "Checkmate! You executed the endgame perfectly!",
            detail: position.explanation,
          });
        } else {
          addCoachMessage({
            type: "mistake",
            content: "Oops — you got mated! Study the defensive technique.",
            detail: position.explanation,
          });
        }
      } else if (chess.isDraw()) {
        const r: EndgameResult =
          position.objective === "draw" ? "win" : "loss";
        setResult(r);
        addCoachMessage({
          type: r === "win" ? "praise" : "mistake",
          content:
            r === "win"
              ? "Draw achieved! That's the correct result."
              : "The game is drawn, but you should have won.",
          detail: position.explanation,
        });
      }
    }
  }, [fen]);

  // ── Player move handler ───────────────────────────────────────────────────

  const handleMovePlayed = useCallback(
    async (san: string) => {
      if (result || isEngineThinking) return;
      setMoveCount((c) => c + 1);

      // Check game over after player move
      const chess = new Chess(useGameStore.getState().fen);
      if (chess.isGameOver()) return; // handled by effect above

      // Engine responds
      setIsEngineThinking(true);
      try {
        await analyze(useGameStore.getState().fen);
        const analysis = useGameStore.getState().lastAnalysis;
        if (!analysis?.bestMove || analysis.bestMove === "(none)") {
          setIsEngineThinking(false);
          return;
        }

        const engFen = useGameStore.getState().fen;
        const engSAN = uciToSan(engFen, analysis.bestMove);
        const uci = analysis.bestMove;

        const engineMade = makeMove({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length === 5 ? uci[4] : undefined,
        });

        if (!engineMade) {
          setIsEngineThinking(false);
          return;
        }

        // Check for game over after engine move
        const chessAfter = new Chess(useGameStore.getState().fen);
        if (chessAfter.isGameOver()) {
          setIsEngineThinking(false);
          return; // effect handles it
        }

        // Provide coaching hint every 3 moves
        if (moveCount % 3 === 0 && moveCount > 0) {
          const keyMove = position.keyMoves[Math.floor(moveCount / 3)] ?? position.keyMoves.at(-1);
          if (keyMove) {
            addCoachMessage({
              type: "hint",
              content: `Remember: ${keyMove}`,
              detail: position.explanation,
            });
          }
        }
      } finally {
        setIsEngineThinking(false);
      }
    },
    [result, isEngineThinking, analyze, makeMove, moveCount, position]
  );

  function handleReset() {
    loadFen(position.fen);
    setResult(null);
    setMoveCount(0);
    setIsEngineThinking(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const objectiveLabel = {
    win: "Win this endgame",
    draw: "Hold the draw",
    survive: "Survive",
  }[position.objective];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      {/* Board column */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
              {position.title}
            </h2>
            {position.theoryName && (
              <p className="text-xs font-medium text-brand dark:text-brand-light mt-0.5">
                {position.theoryName}
              </p>
            )}
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {position.theme}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand dark:text-brand-light font-medium">
                {objectiveLabel}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                {position.difficulty}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
            {onNext && (
              <Button variant="ghost" size="sm" onClick={onNext}>
                Skip →
              </Button>
            )}
          </div>
        </div>

        <ChessBoard
          interactive={!result && !isEngineThinking}
          allowedColor={position.sideToMove}
          onMovePlayed={handleMovePlayed}
        />

        {/* Engine thinking indicator */}
        {isEngineThinking && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 animate-pulse-soft">
            <span className="w-2 h-2 bg-brand rounded-full inline-block" />
            Engine is thinking…
          </div>
        )}

        {/* Result banner */}
        {result && (
          <div
            className={`rounded-2xl p-4 animate-slide-in ${
              result === "win"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30"
                : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30"
            }`}
          >
            <p
              className={`font-bold text-lg ${
                result === "win"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {result === "win"
                ? "🏆 Well done! Objective achieved."
                : "📚 Not quite — let's review the technique."}
            </p>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Try again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTheory(true)}
              >
                Study theory
              </Button>
              {onNext && result === "win" && (
                <Button variant="primary" size="sm" onClick={onNext}>
                  Next →
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-3">
        <Card
          title="Position Goal"
          headerAction={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowTheory(!showTheory)}
            >
              {showTheory ? "Hide" : "Theory"}
            </Button>
          }
        >
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {position.description}
          </p>
          {showTheory && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Key Ideas
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {position.explanation}
              </p>
              {position.keyMoves.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {position.keyMoves.map((m) => (
                    <span
                      key={m}
                      className="font-mono text-xs bg-brand/10 text-brand dark:text-brand-light px-2 py-0.5 rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Moves Played">
          <MoveHistory history={history} />
        </Card>

        <CoachPanel />
      </div>
    </div>
  );
}
