"use client";

import type React from "react";
import { create } from "zustand";
import { Chess } from "chess.js";
import type {
  TrainingMode,
  Color,
  ChessMove,
  EngineAnalysis,
  CoachMessage,
} from "@/types";

interface GameStore {
  // Core game state
  fen: string;
  history: string[]; // SAN
  uciHistory: string[]; // UCI for engine
  turn: "w" | "b";

  // Training context
  mode: TrainingMode | null;
  currentOpeningId: string | null;
  currentPositionId: string | null;
  orientation: Color;

  // UI state
  isThinking: boolean;
  lastMoveSAN: string | null;
  lastMoveSquares: { from: string; to: string } | null;
  highlightedSquares: Record<string, React.CSSProperties>;

  // Analysis
  lastAnalysis: EngineAnalysis | null;
  previousEval: number;

  // Coach messages
  coachMessages: CoachMessage[];

  // Actions
  makeMove: (move: ChessMove) => string | null; // returns SAN or null if illegal
  loadFen: (fen: string) => void;
  resetGame: () => void;
  resetToStarting: () => void;
  setMode: (mode: TrainingMode | null) => void;
  setOrientation: (color: Color) => void;
  setCurrentOpeningId: (id: string | null) => void;
  setCurrentPositionId: (id: string | null) => void;
  setThinking: (thinking: boolean) => void;
  setAnalysis: (analysis: EngineAnalysis | null) => void;
  addCoachMessage: (msg: CoachMessage) => void;
  clearCoachMessages: () => void;
  setHighlightedSquares: (squares: Record<string, React.CSSProperties>) => void;
  flipBoard: () => void;
  undoMove: () => void;
}

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const useGameStore = create<GameStore>((set, get) => {
  // Internal chess instance (not stored in state to avoid serialisation issues)
  let _chess = new Chess();

  return {
    fen: STARTING_FEN,
    history: [],
    uciHistory: [],
    turn: "w",
    mode: null,
    currentOpeningId: null,
    currentPositionId: null,
    orientation: "white",
    isThinking: false,
    lastMoveSAN: null,
    lastMoveSquares: null,
    highlightedSquares: {},
    lastAnalysis: null,
    previousEval: 0,
    coachMessages: [],

    makeMove: (move: ChessMove) => {
      const currentEval = get().lastAnalysis?.evaluation ?? 0;
      try {
        const result = _chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion ?? "q",
        });

        set((state) => ({
          fen: _chess.fen(),
          history: [...state.history, result.san],
          uciHistory: [
            ...state.uciHistory,
            `${result.from}${result.to}${result.promotion ?? ""}`,
          ],
          turn: _chess.turn(),
          lastMoveSAN: result.san,
          lastMoveSquares: { from: result.from, to: result.to },
          previousEval: currentEval,
          lastAnalysis: null, // clear stale analysis
        }));

        return result.san;
      } catch {
        return null;
      }
    },

    loadFen: (fen: string) => {
      try {
        _chess = new Chess(fen);
        set({
          fen,
          history: [],
          uciHistory: [],
          turn: _chess.turn(),
          lastMoveSAN: null,
          lastMoveSquares: null,
          lastAnalysis: null,
          previousEval: 0,
          highlightedSquares: {},
        });
      } catch (e) {
        console.error("Invalid FEN:", fen);
      }
    },

    resetGame: () => {
      _chess = new Chess();
      set({
        fen: STARTING_FEN,
        history: [],
        uciHistory: [],
        turn: "w",
        lastMoveSAN: null,
        lastMoveSquares: null,
        lastAnalysis: null,
        previousEval: 0,
        highlightedSquares: {},
        coachMessages: [],
        isThinking: false,
      });
    },

    resetToStarting: () => {
      _chess = new Chess();
      set({
        fen: STARTING_FEN,
        history: [],
        uciHistory: [],
        turn: "w",
        lastMoveSAN: null,
        lastMoveSquares: null,
        lastAnalysis: null,
        previousEval: 0,
      });
    },

    setMode: (mode) => set({ mode }),
    setOrientation: (orientation) => set({ orientation }),
    setCurrentOpeningId: (id) => set({ currentOpeningId: id }),
    setCurrentPositionId: (id) => set({ currentPositionId: id }),
    setThinking: (isThinking) => set({ isThinking }),
    setAnalysis: (lastAnalysis) => set({ lastAnalysis }),

    addCoachMessage: (msg) =>
      set((state) => ({
        coachMessages: [msg, ...state.coachMessages].slice(0, 20), // keep last 20
      })),

    clearCoachMessages: () => set({ coachMessages: [] }),

    setHighlightedSquares: (highlightedSquares) =>
      set({ highlightedSquares }),

    flipBoard: () =>
      set((state) => ({
        orientation: state.orientation === "white" ? "black" : "white",
      })),

    undoMove: () => {
      const move = _chess.undo();
      if (!move) return;
      set((state) => ({
        fen: _chess.fen(),
        history: state.history.slice(0, -1),
        uciHistory: state.uciHistory.slice(0, -1),
        turn: _chess.turn(),
        lastMoveSAN: state.history.at(-2) ?? null,
        lastMoveSquares: null,
        lastAnalysis: null,
      }));
    },
  };
});
