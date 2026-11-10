"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Opening, OpeningBranch } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useProgressStore } from "@/lib/store/progress-store";
import { ChessBoard } from "@/components/board/ChessBoard";
import { MoveHistory } from "@/components/board/MoveHistory";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sanToUci } from "@/lib/utils/chess-utils";

interface OpeningTrainerProps {
  opening: Opening;
  branch?: OpeningBranch;
  playerColor?: "white" | "black";
}

type TrainStatus = "playing" | "correct" | "wrong" | "complete";

export function OpeningTrainer({
  opening,
  branch,
  playerColor = "white",
}: OpeningTrainerProps) {
  const moves = branch?.moves ?? opening.moves;
  const openingId = branch?.id ?? opening.id;

  const {
    makeMove,
    resetGame,
    setOrientation,
    setMode,
    setCurrentOpeningId,
    addCoachMessage,
    undoMove,
    history,
  } = useGameStore();
  const { updateOpeningProgress } = useProgressStore();

  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<TrainStatus>("playing");
  const [feedback, setFeedback] = useState("");
  const [accuracy, setAccuracy] = useState({ correct: 0, total: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlayersMove = useCallback(
    (idx: number) => (playerColor === "white" ? idx % 2 === 0 : idx % 2 === 1),
    [playerColor]
  );

  // ── Setup ─────────────────────────────────────────────────────────────────

  const startDrill = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    resetGame();
    setMoveIndex(0);
    setStatus("playing");
    setFeedback("");
    setShowExplanation(false);
    setAccuracy({ correct: 0, total: 0 });
  }, [resetGame]);

  useEffect(() => {
    startDrill();
    setOrientation(playerColor);
    setMode("openings");
    setCurrentOpeningId(openingId);
  }, [openingId, playerColor, startDrill, setOrientation, setMode, setCurrentOpeningId]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    []
  );

  // Play the opponent's book moves, and finish when the line runs out
  useEffect(() => {
    if (status !== "playing") return;
    if (moveIndex >= moves.length) {
      setStatus("complete");
      return;
    }
    if (isPlayersMove(moveIndex)) return;

    const timer = setTimeout(() => {
      const uci = sanToUci(useGameStore.getState().fen, moves[moveIndex]);
      const played =
        uci &&
        makeMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!played) {
        console.error(`Book move ${moves[moveIndex]} is illegal in ${openingId}`);
        setStatus("complete");
        return;
      }
      setMoveIndex(moveIndex + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [moveIndex, status, moves, isPlayersMove, makeMove, openingId]);

  // ── Player Move Handler ───────────────────────────────────────────────────

  const handleMovePlayed = useCallback(
    (_san: string, from: string, to: string) => {
      if (status !== "playing") return;

      const expected = moves[moveIndex];
      if (!expected) return;

      // The board always follows the book line, so the position before this
      // move is the book line up to moveIndex. Compare squares rather than
      // SAN text so "+", "#" and disambiguation differences don't matter.
      const expectedUci = sanToUci(fenAfter(moves.slice(0, moveIndex)), expected);
      const correct = expectedUci?.slice(0, 4) === `${from}${to}`;

      setAccuracy((a) => ({
        correct: a.correct + (correct ? 1 : 0),
        total: a.total + 1,
      }));
      updateOpeningProgress(openingId, correct);

      if (correct) {
        setFeedback("✓ Correct!");
        setStatus("correct");
        advanceTimerRef.current = setTimeout(() => {
          setFeedback("");
          setMoveIndex(moveIndex + 1);
          setStatus("playing");
        }, 800);
      } else {
        setFeedback(`✗ Expected ${expected}`);
        setStatus("wrong");
        addCoachMessage({
          type: "feedback",
          content: `The book move here is **${expected}**. ${getMoveReason(expected, branch?.plans ?? opening.plans)}`,
          detail: branch?.description ?? opening.description,
        });
      }
    },
    [status, moves, moveIndex, opening, branch, openingId, updateOpeningProgress, addCoachMessage]
  );

  function handleRetry() {
    undoMove();
    setStatus("playing");
    setFeedback("");
  }

  const handleRestart = startDrill;

  const isPlayerTurn = status === "playing" && isPlayersMove(moveIndex);

  const progressPct =
    moves.length > 0 ? Math.round((moveIndex / moves.length) * 100) : 0;
  const accPct =
    accuracy.total > 0
      ? Math.round((accuracy.correct / accuracy.total) * 100)
      : 100;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      {/* Board column */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
              {branch?.name ?? opening.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Playing as {playerColor} · Move {moveIndex}/{moves.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Accuracy: <span className={accPct >= 80 ? "text-emerald-500" : accPct >= 60 ? "text-yellow-500" : "text-red-500"}>{accPct}%</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              Restart
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ChessBoard
          interactive={isPlayerTurn}
          onMovePlayed={handleMovePlayed}
          allowedColor={playerColor}
        />

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`rounded-xl px-4 py-2 text-sm font-medium animate-slide-in ${
              status === "correct"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40"
            }`}
          >
            {feedback}
            {status === "wrong" && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRetry}
                className="ml-3"
              >
                Try again
              </Button>
            )}
          </div>
        )}

        {/* Complete banner */}
        {status === "complete" && (
          <div className="rounded-2xl bg-gradient-to-br from-brand/10 to-violet-500/10 border border-brand/20 p-5 text-center animate-slide-in">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-zinc-900 dark:text-zinc-100">
              Opening complete!
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Final accuracy: {accPct}% ({accuracy.correct}/{accuracy.total})
            </p>
            <div className="flex gap-2 justify-center mt-3">
              <Button variant="primary" size="sm" onClick={handleRestart}>
                Practice again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExplanation(true)}
              >
                Study ideas
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-3">
        {/* Opening info */}
        <Card title="Opening Plans">
          <div className="space-y-2">
            {(branch?.plans ?? opening.plans).map((plan, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-brand mt-0.5 shrink-0">→</span>
                <span className="text-zinc-700 dark:text-zinc-300">{plan}</span>
              </div>
            ))}
          </div>
          {(branch?.description ?? opening.description) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {branch?.description ?? opening.description}
            </p>
          )}
        </Card>

        {/* Move history */}
        <Card title="Moves Played">
          <MoveHistory history={history} />
        </Card>

        {/* Coach */}
        <CoachPanel />
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fenAfter(sanMoves: string[]): string {
  const chess = new Chess();
  for (const san of sanMoves) chess.move(san);
  return chess.fen();
}

function getMoveReason(san: string, plans: string[]): string {
  if (san.startsWith("O-O")) return "Castling keeps the king safe.";
  if (/^[a-h][45]$/.test(san)) return "This pawn fights for the center.";
  if (/^[NB]/.test(san)) return "Developing pieces is a key opening principle.";
  return plans[0] ?? "This is the standard book move in this variation.";
}
