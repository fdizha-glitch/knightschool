// ─── Core Chess Types ──────────────────────────────────────────────────────

export type Color = "white" | "black";
export type ColorCode = "w" | "b";
export type TrainingMode = "openings" | "middlegame" | "endgames";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type MoveQuality =
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san?: string;
  uci?: string;
}

// ─── Opening Data Types ────────────────────────────────────────────────────

export interface OpeningBranch {
  id: string;
  name: string;
  moves: string[]; // SAN moves from start position
  fen?: string; // FEN of the final position (informational)
  description: string;
  plans: string[];
  tags: string[];
  keyMoves?: string[];
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  family: string;
  color: Color; // which side the user is drilling
  description: string;
  moves: string[]; // trunk moves (SAN)
  fen?: string; // FEN after trunk moves
  plans: string[];
  branches: OpeningBranch[];
}

// ─── Position Data Types ───────────────────────────────────────────────────

export interface MiddlegamePosition {
  id: string;
  title: string;
  fen: string;
  theme: string[];
  difficulty: Difficulty;
  sideToMove: Color;
  description: string;
  hints: string[];
  bestMoves: string[]; // SAN
  explanation: string;
  followUp?: string;
}

export interface EndgamePosition {
  id: string;
  title: string;
  fen: string;
  theme: string;
  difficulty: Difficulty;
  sideToMove: Color;
  objective: "win" | "draw" | "survive";
  description: string;
  explanation: string;
  keyMoves: string[];
  theoryName?: string; // e.g. "Lucena Position", "Philidor Position"
}

// ─── Engine / Analysis Types ───────────────────────────────────────────────

export interface PVLine {
  moves: string[]; // UCI moves
  evaluation: number; // in centipawns (positive = white ahead)
  mate: number | null; // null or mate-in-N
  depth: number;
}

export interface EngineAnalysis {
  bestMove: string; // UCI e.g. "e2e4"
  bestMoveSAN?: string;
  evaluation: number; // centipawns, positive = white ahead (mates folded in as ±MATE_CP)
  mate: number | null; // mate-in-N from White's view (negative = Black mates), 0 = side to move is mated
  lines: PVLine[];
  depth: number;
  source?: "stockfish" | "fallback";
}

// ─── Coaching Types ────────────────────────────────────────────────────────

export type CoachMessageType =
  | "evaluation"
  | "plan"
  | "principle"
  | "tactic"
  | "feedback"
  | "hint"
  | "mistake"
  | "praise";

export interface CoachMessage {
  type: CoachMessageType;
  content: string; // short (1–2 sentences shown by default)
  detail?: string; // "More detail" expansion
  moves?: string[]; // highlighted moves
  principle?: string; // chess principle anchored to moment
}

export interface TranscriptResult {
  text: string;
  confidence?: number;
}

// ─── Game State ────────────────────────────────────────────────────────────

export interface GameState {
  fen: string;
  history: string[]; // SAN history
  uciHistory: string[]; // UCI history (for engine)
  mode: TrainingMode | null;
  currentOpeningId: string | null;
  currentPositionId: string | null;
  orientation: Color;
  isThinking: boolean; // engine is thinking
  lastAnalysis: EngineAnalysis | null;
  coachMessages: CoachMessage[];
}

// ─── Progress / Profile ────────────────────────────────────────────────────

export interface MistakeRecord {
  id: string;
  fen: string; // FEN before the mistake
  movePlayed: string;
  bestMove: string;
  evaluation: number;
  mode: TrainingMode;
  theme?: string;
  timestamp: number;
  explanation: string;
  reviewed: boolean;
}

export interface OpeningProgress {
  openingId: string;
  correct: number;
  total: number;
  streak: number;
  lastSeen: number;
}

export interface UserProgress {
  totalMoves: number;
  totalSessions: number;
  dailyStreak: number;
  lastSessionDate: string; // ISO
  openingProgress: Record<string, OpeningProgress>;
  tacticsScore: number;
  endgameScore: number;
  mistakes: MistakeRecord[];
}

// ─── Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: "light" | "dark" | "system";
  defaultColor: Color;
  engineDepth: number; // 1–20
  engineLines: number; // 1–5
  voiceEnabled: boolean;
  ttsEnabled: boolean;
  showEvalBar: boolean;
  showBestMove: boolean;
  animationSpeed: number; // ms
  boardTheme: "classic" | "wood" | "neon";
}
