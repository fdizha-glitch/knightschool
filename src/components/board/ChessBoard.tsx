"use client";

import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { EvalBar } from "./EvalBar";
import { uciToSan } from "@/lib/utils/chess-utils";

interface ChessBoardProps {
  interactive?: boolean;
  allowedColor?: "white" | "black" | "both";
  onMovePlayed?: (san: string, from: string, to: string) => void;
  className?: string;
  boardSize?: number;
}

export function ChessBoard({
  interactive = true,
  allowedColor = "both",
  onMovePlayed,
  className = "",
  boardSize,
}: ChessBoardProps) {
  const {
    fen,
    orientation,
    lastMoveSquares,
    highlightedSquares,
    makeMove,
    lastAnalysis,
    isThinking,
  } = useGameStore();
  const { settings } = useSettingsStore();

  const [clickedSquare, setClickedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<
    Record<string, React.CSSProperties>
  >({});

  // ── Highlight squares ────────────────────────────────────────────────────

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last move highlight
    if (lastMoveSquares) {
      styles[lastMoveSquares.from] = {
        backgroundColor: "rgba(205, 209, 110, 0.5)",
      };
      styles[lastMoveSquares.to] = {
        backgroundColor: "rgba(205, 209, 110, 0.7)",
      };
    }

    // Custom highlights (e.g. from drills)
    Object.assign(styles, highlightedSquares);

    // Clicked square
    if (clickedSquare) {
      styles[clickedSquare] = { backgroundColor: "rgba(20, 85, 30, 0.5)" };
    }

    // Legal move options
    Object.assign(styles, optionSquares);

    return styles;
  }, [lastMoveSquares, highlightedSquares, clickedSquare, optionSquares]);

  // ── Engine arrows ────────────────────────────────────────────────────────

  const customArrows = useMemo(() => {
    if (!settings.showBestMove || !lastAnalysis?.bestMove) return [];
    const bm = lastAnalysis.bestMove;
    if (bm.length < 4) return [];
    const from = bm.slice(0, 2);
    const to = bm.slice(2, 4);
    const arrows: [string, string, string][] = [[from, to, "rgb(0, 130, 255)"]];

    // Show top-3 lines lightly
    lastAnalysis.lines.slice(1, 3).forEach((line) => {
      if (line.moves[0]?.length >= 4) {
        arrows.push([
          line.moves[0].slice(0, 2),
          line.moves[0].slice(2, 4),
          "rgba(0, 130, 255, 0.35)",
        ]);
      }
    });
    return arrows;
  }, [lastAnalysis, settings.showBestMove]);

  // ── Move handling ─────────────────────────────────────────────────────────

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!interactive) return false;

      const san = makeMove({ from: sourceSquare, to: targetSquare });
      if (!san) return false;

      setClickedSquare(null);
      setOptionSquares({});
      onMovePlayed?.(san, sourceSquare, targetSquare);
      return true;
    },
    [interactive, makeMove, onMovePlayed]
  );

  const onSquareClick = useCallback(
    (square: string) => {
      if (!interactive) return;

      // If we already have a selection, try to move
      if (clickedSquare && clickedSquare !== square) {
        const san = makeMove({ from: clickedSquare, to: square });
        if (san) {
          setClickedSquare(null);
          setOptionSquares({});
          onMovePlayed?.(san, clickedSquare, square);
          return;
        }
      }

      // Select the clicked square
      setClickedSquare(square === clickedSquare ? null : square);
      setOptionSquares({});
    },
    [clickedSquare, interactive, makeMove, onMovePlayed]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex gap-2 items-stretch ${className}`}>
      {/* Eval bar */}
      {settings.showEvalBar && (
        <EvalBar
          evaluation={lastAnalysis?.evaluation ?? 0}
          mate={lastAnalysis?.mate ?? null}
          orientation={orientation}
          className="self-center"
        />
      )}

      {/* Board */}
      {/* Keep the whole board on screen on shorter laptop displays */}
      <div className="relative flex-1 max-w-[min(100%,calc(100vh-14rem))]">
        {isThinking && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 rounded-lg pointer-events-none">
            <div className="bg-white dark:bg-zinc-800 rounded-lg px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-lg animate-pulse-soft">
              Analysing…
            </div>
          </div>
        )}
        <Chessboard
          id="KnightSchoolBoard"
          position={fen}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows as any}
          animationDuration={settings.animationSpeed}
          // Only pass boardWidth when fixed: react-chessboard spreads props over
          // its own measured width, so an explicit undefined leaves it at zero
          // and it renders only its loading piece.
          {...(boardSize ? { boardWidth: boardSize } : {})}
          customBoardStyle={{
            borderRadius: "8px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}
          customDarkSquareStyle={{ backgroundColor: "#b58863" }}
          customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
        />
      </div>
    </div>
  );
}
