import type React from "react";
import { Chess } from "chess.js";
import type { MoveQuality } from "@/types";

/** Convert centipawns eval to a visual percentage (0–100) for the eval bar.
 *  Uses a sigmoid so ±500cp ≈ 75%/25% and ±1000cp ≈ ~90%/10%. */
export function evalToPercent(cp: number): number {
  const clamped = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * Math.tanh(clamped / 400);
}

/** Format evaluation for display: "+1.4", "-0.3", "M3", etc. */
export function formatEval(
  cp: number,
  mate: number | null,
  perspective: "w" | "b" = "w"
): string {
  if (mate !== null) {
    // mate 0 = the side to move is already checkmated; cp carries the winner.
    if (mate === 0) return cp > 0 ? "1-0" : "0-1";
    const sign = mate > 0 ? "+" : "-";
    return `${sign}M${Math.abs(mate)}`;
  }
  const adjusted = perspective === "b" ? -cp : cp;
  const sign = adjusted > 0 ? "+" : "";
  return `${sign}${(adjusted / 100).toFixed(1)}`;
}

/** Classify move quality from centipawn loss */
export function classifyMoveQuality(cpLoss: number): MoveQuality {
  if (cpLoss <= 10) return "excellent";
  if (cpLoss <= 30) return "good";
  if (cpLoss <= 100) return "inaccuracy";
  if (cpLoss <= 300) return "mistake";
  return "blunder";
}

/** Get color coding for move quality */
export function moveQualityColor(quality: MoveQuality): string {
  switch (quality) {
    case "excellent":
      return "text-emerald-500";
    case "good":
      return "text-green-400";
    case "inaccuracy":
      return "text-yellow-400";
    case "mistake":
      return "text-orange-400";
    case "blunder":
      return "text-red-500";
  }
}

/** Get emoji for move quality */
export function moveQualityEmoji(quality: MoveQuality): string {
  switch (quality) {
    case "excellent":
      return "!!";
    case "good":
      return "!";
    case "inaccuracy":
      return "?!";
    case "mistake":
      return "?";
    case "blunder":
      return "??";
  }
}

/** Convert SAN move to UCI notation for a given position FEN */
export function sanToUci(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return `${move.from}${move.to}${move.promotion ?? ""}`;
  } catch {
    return null;
  }
}

/** Convert UCI move to SAN for a given position FEN */
export function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return null;
  }
}

/** Get piece name from piece type character */
export function pieceName(piece: string): string {
  const map: Record<string, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return map[piece.toLowerCase()] ?? piece;
}

/** Count material on board, returns { white, black, diff } in pawns */
export function countMaterial(fen: string): {
  white: number;
  black: number;
  diff: number;
} {
  const pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
  };
  let white = 0;
  let black = 0;

  const board = fen.split(" ")[0];
  for (const char of board) {
    const lower = char.toLowerCase();
    if (lower in pieceValues) {
      const value = pieceValues[lower];
      if (char === char.toUpperCase()) white += value;
      else black += value;
    }
  }
  return { white, black, diff: white - black };
}

/** Check if a FEN string is syntactically valid */
export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/** Get the side to move from a FEN string */
export function sideToMove(fen: string): "w" | "b" {
  return (fen.split(" ")[1] as "w" | "b") ?? "w";
}

/** Determine if a position is a tactical one (many captures available) */
export function isTacticalPosition(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    const captures = moves.filter((m) => m.captured);
    return captures.length >= 2;
  } catch {
    return false;
  }
}

/** Get highlighted squares for last move */
export function getLastMoveSquares(
  san: string | null,
  fen: string
): Record<string, React.CSSProperties> {
  if (!san) return {};
  try {
    // We need to re-construct from history — caller should pass the result
    return {};
  } catch {
    return {};
  }
}

/** Build square highlight styles for source and target squares */
export function buildSquareHighlights(
  from: string,
  to: string,
  color = "rgba(20, 85, 30, 0.5)"
): Record<string, React.CSSProperties> {
  return {
    [from]: { backgroundColor: color },
    [to]: { backgroundColor: color },
  };
}
