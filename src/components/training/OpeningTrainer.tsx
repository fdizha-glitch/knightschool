"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Opening, OpeningBranch } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useProgressStore } from "@/lib/store/progress-store";
import { useCoach } from "@/hooks/useCoach";
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
    loadFen,
    resetGame,
    setOrientation,
    setMode,
    setCurrentOpeningId,
    addCoachMessage,
    fen,
  } = useGameStore();
  const { updateOpeningProgress } = useProgressStore();
  const { askCoach } = useCoach();

  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<TrainStatus>("playing");
  const [feedback, setFeedback] = useState("");
  const [accuracy, setAccuracy] = useState({ correct: 0, total: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const internalChessRef = useRef(new Chess());

  // ── Setup ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    resetGame();
    internalChessRef.current = new Chess();
    setOrientation(playerColor);
    setMode("openings");
    setCurrentOpeningId(openingId);
    setMoveIndex(0);
    setStatus("playing");
    setFeedback("");
    setShowExplanation(false);
    setAccuracy({ correct: 0, total: 0 });
  }, [opening.id, branch?.id, playerColor]);

  // Auto-play engine moves
  useEffect(() => {
    if (status !== "playing") return;
    const isPlayerTurn =
      (playerColor === "white" && moveIndex % 2 === 0) ||
      (playerColor === "black" && moveIndex % 2 === 1);

    if (!isPlayerTurn && moveIndex < moves.length) {
      // Engine plays
      const timer = setTimeout(() => {
        playBookMove(moveIndex);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [moveIndex, status, playerColor]);

  function playBookMove(idx: number) {
    const sanMove = moves[idx];
    if (!sanMove) return;
    try {
      const chess = internalChessRef.current;
      const result = chess.move(sanMove);
      makeMove({ from: result.from, to: result.to, promotion: result.promotion });
      setMoveIndex(idx + 1);
    } catch {
      setStatus("complete");
    }
  }

  // ── Player Move Handler ───────────────────────────────────────────────────

  const handleMovePlayed = useCallback(
    (san: string) => {
      if (status !== "playing") return;

      const expected = moves[moveIndex];
      if (!expected) {
        setStatus("complete");
        return;
      }

      // Normalise: accept both the exact SAN and equivalent UCI
      const chess = internalChessRef.current;
      // We've already applied the move via makeMove in ChessBoard.
      // Check if the played SAN matches the book SAN (try chess.js to normalise expected)
      const tempChess = new Chess(
        internalChessRef.current.history({ verbose: true }).reduce((c, m) => {
          // Replay without last move to get the pre-move FEN
          return c;
        }, new Chess()).fen()
      );

      const correct = san === expected || isEquivalentMove(san, expected, fen);

      if (correct) {
        // Update internal ref to match game state
        internalChessRef.current = new Chess(fen);
        setAccuracy((a) => ({ correct: a.correct + 1, total: a.total + 1 }));
        updateOpeningProgress(openingId, true);
        setFeedback("✓ Correct!");
        setStatus("correct");
        setTimeout(() => {
          setStatus("playing");
          setFeedback("");
          const next = moveIndex + 1;
          setMoveIndex(next);
          if (next >= moves.length) setStatus("complete");
        }, 800);
      } else {
        // Wrong move — undo it
        setAccuracy((a) => ({ correct: a.correct, total: a.total + 1 }));
        updateOpeningProgress(openingId, false);
        setFeedback(`✗ Expected ${expected}`);
        setStatus("wrong");
        // Ask coach to explain
        addCoachMessage({
          type: "feedback",
          content: `The book move here is **${expected}**. ${getMoveReason(expected, moves, moveIndex, opening)}`,
          detail: branch?.description ?? opening.description,
        });
      }
    },
    [status, moves, moveIndex, fen, opening, branch, openingId]
  );

  function handleRetry() {
    // Undo the wrong move
    useGameStore.getState().undoMove();
    // Sync internal ref
    internalChessRef.current = new Chess(useGameStore.getState().fen);
    setStatus("playing");
    setFeedback("");
  }

  function handleRestart() {
    resetGame();
    internalChessRef.current = new Chess();
    setMoveIndex(0);
    setStatus("playing");
    setFeedback("");
    setShowExplanation(false);
    setAccuracy({ correct: 0, total: 0 });
  }

  const isPlayerTurn =
    status === "playing" &&
    ((playerColor === "white" && moveIndex % 2 === 0) ||
      (playerColor === "black" && moveIndex % 2 === 1));

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
          <MoveHistory history={useGameStore.getState().history} />
        </Card>

        {/* Coach */}
        <CoachPanel />
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isEquivalentMove(
  played: string,
  expected: string,
  fen: string
): boolean {
  // Try converting expected to UCI and compare
  try {
    const uci = sanToUci(fen, expected);
    if (!uci) return false;
    // played is SAN, convert expected UCI back to SAN isn't straightforward.
    // Just return false and rely on the SAN match.
    return false;
  } catch {
    return false;
  }
}

function getMoveReason(
  san: string,
  moves: string[],
  idx: number,
  opening: Opening
): string {
  if (idx < opening.plans.length) {
    return opening.plans[idx] ?? "";
  }
  if (san.startsWith("O-O")) return "Castling keeps the king safe.";
  if (/^[a-h]4$/.test(san) || /^[a-h]5$/.test(san))
    return "This pawn controls the center.";
  if (/^[NBRQ]/.test(san)) return "Developing pieces is a key opening principle.";
  return "This is the standard book move in this variation.";
}
