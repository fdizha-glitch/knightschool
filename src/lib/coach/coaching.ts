import { Chess } from "chess.js";
import type { CoachMessage, EngineAnalysis } from "@/types";
import { countMaterial, formatEval, uciToSan } from "@/lib/utils/chess-utils";

export interface CoachContext {
  fen: string;
  lastMoveSAN?: string;
  lastMoveUCI?: string;
  analysis?: EngineAnalysis;
  voiceInput?: string;
  mode?: "openings" | "middlegame" | "endgames";
  previousEval?: number; // eval before the last move
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

export function generateCoachMessage(ctx: CoachContext): CoachMessage {
  const { voiceInput } = ctx;
  if (voiceInput && voiceInput.trim().length > 0) {
    return respondToVoice(voiceInput, ctx);
  }
  return analyzeAndExplain(ctx);
}

// ─── Voice Input Handler ───────────────────────────────────────────────────

function respondToVoice(input: string, ctx: CoachContext): CoachMessage {
  const lower = input.toLowerCase();

  // "Why?" / "Why is this bad?" / "What went wrong?"
  if (/why|what went wrong|bad move|mistake|blunder/.test(lower)) {
    return explainLastMove(ctx);
  }

  // "What's the plan?" / "What should I do?" / "Plan?"
  if (/plan|what should|what.*do|next move|strategy/.test(lower)) {
    return suggestPlan(ctx);
  }

  // "Hint" / "Give me a hint"
  if (/hint|help|clue/.test(lower)) {
    return giveHint(ctx);
  }

  // "How good is my position?" / "Am I winning?"
  if (/position|winning|losing|equal|how.*good|evaluation/.test(lower)) {
    return evaluatePosition(ctx);
  }

  // Move proposal: "I think Nc6", "best move is e4", "play d4"
  const moveMatch = input.match(
    /(?:think|try|play|move|candidate|best.*is)?\s+([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#=]?[NBRQK]?)/i
  );
  if (moveMatch) {
    return evaluateProposedMove(moveMatch[1].trim(), ctx);
  }

  return {
    type: "feedback",
    content:
      "I'm here to help! Ask me: 'Why is this bad?', 'What's the plan?', 'Give me a hint', or propose a move like 'I think Nc6'.",
  };
}

// ─── Position Analysis ─────────────────────────────────────────────────────

function analyzeAndExplain(ctx: CoachContext): CoachMessage {
  const { fen, analysis, lastMoveSAN, previousEval, mode } = ctx;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { type: "feedback", content: "Unable to parse position." };
  }

  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    return {
      type: "praise",
      content: `Checkmate! ${winner} wins. Well played!`,
      detail:
        "The king has no legal escape. Study the final attacking pattern — it will come up again.",
    };
  }

  if (chess.isDraw()) {
    return {
      type: "evaluation",
      content: "The game is drawn. Perfect defence or forced repetition.",
      detail: drawReason(chess),
    };
  }

  if (chess.inCheck()) {
    const side = chess.turn() === "w" ? "White" : "Black";
    return {
      type: "tactic",
      content: `${side} is in check! Resolve the check before planning ahead.`,
      detail: "Options: move the king, block with a piece, or capture the attacker.",
    };
  }

  // Was the last move a blunder?
  if (
    lastMoveSAN &&
    previousEval !== undefined &&
    analysis &&
    mode === "middlegame"
  ) {
    // Evals are from White's view; the side that just moved is the one NOT
    // to move now. Positive cpLoss = that side's position got worse.
    const moverSign = chess.turn() === "w" ? -1 : 1;
    const cpLoss = (previousEval - analysis.evaluation) * moverSign;

    if (cpLoss > 200) {
      return blunderFeedback(lastMoveSAN, cpLoss, ctx);
    }
  }

  return buildPositionMessage(chess, analysis, lastMoveSAN, mode);
}

function buildPositionMessage(
  chess: Chess,
  analysis: EngineAnalysis | undefined,
  lastMoveSAN: string | undefined,
  mode: string | undefined
): CoachMessage {
  const mat = countMaterial(chess.fen());
  const turn = chess.turn() === "w" ? "White" : "Black";
  const evalStr = analysis
    ? formatEval(analysis.evaluation, analysis.mate)
    : "equal";

  const parts: string[] = [];

  // 1) What changed
  if (lastMoveSAN) {
    parts.push(`After **${lastMoveSAN}** — ${whatChanged(chess, lastMoveSAN)}`);
  }

  // 2) Eval summary
  if (analysis) {
    const adv =
      analysis.evaluation > 50
        ? "White is slightly better"
        : analysis.evaluation < -50
          ? "Black is slightly better"
          : "Position is roughly equal";
    parts.push(`${adv} (${evalStr}).`);
  }

  // 3) Plan suggestion
  parts.push(planForTurn(chess, analysis));

  const content = parts.join(" ");
  const detail = principleForPosition(chess, analysis, mode);
  const bestMoveSAN =
    analysis?.bestMove && analysis.bestMove !== "(none)"
      ? uciToSan(chess.fen(), analysis.bestMove) ?? analysis.bestMove
      : undefined;

  return {
    type: "plan",
    content,
    detail,
    moves: bestMoveSAN ? [bestMoveSAN] : undefined,
    principle: chessPrinciple(chess),
  };
}

// ─── Individual Response Builders ─────────────────────────────────────────

function explainLastMove(ctx: CoachContext): CoachMessage {
  const { fen, lastMoveSAN, analysis, previousEval } = ctx;
  if (!lastMoveSAN) {
    return {
      type: "feedback",
      content: "No move has been played yet in this position.",
    };
  }

  // How much the side that just moved lost (evals are from White's view).
  const moverSign = fen.split(" ")[1] === "w" ? -1 : 1;
  const evalDrop =
    analysis && previousEval !== undefined
      ? (previousEval - analysis.evaluation) * moverSign
      : 0;

  if (evalDrop > 300) {
    return {
      type: "mistake",
      content: `**${lastMoveSAN}** was a significant error (≈${(evalDrop / 100).toFixed(1)} pawns lost).`,
      detail: analysis?.bestMove
        ? `Your opponent's best reply is now ${uciToSan(fen, analysis.bestMove) ?? analysis.bestMove}, which ${whyBetterMove(ctx)}.`
        : "Look for forcing moves — checks, captures, and threats — before quieter moves.",
      principle: "Always check forcing moves first (CCT: Checks, Captures, Threats).",
    };
  }

  return {
    type: "evaluation",
    content: `**${lastMoveSAN}** was a reasonable move. ${whatChanged(new Chess(fen), lastMoveSAN)}`,
    detail: "Each move should improve your piece activity or worsen the opponent's.",
  };
}

function suggestPlan(ctx: CoachContext): CoachMessage {
  const { fen, analysis } = ctx;
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { type: "plan", content: "Unable to parse position." };
  }

  const plan = planForTurn(chess, analysis);
  const principle = chessPrinciple(chess);
  const bestSAN =
    analysis?.bestMove && analysis.bestMove !== "(none)"
      ? uciToSan(fen, analysis.bestMove) ?? analysis.bestMove
      : null;

  return {
    type: "plan",
    content: plan,
    detail: bestSAN
      ? `Engine top choice is **${bestSAN}**. ${principle}`
      : principle,
    moves: bestSAN ? [bestSAN] : undefined,
    principle,
  };
}

function giveHint(ctx: CoachContext): CoachMessage {
  const { fen, analysis } = ctx;
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { type: "hint", content: "Unable to parse position." };
  }

  const theme = detectTacticalTheme(chess);
  if (theme) {
    return {
      type: "hint",
      content: `Look for a **${theme}** in this position.`,
      detail: themeExplanation(theme),
    };
  }

  const plan = planForTurn(chess, analysis);
  return {
    type: "hint",
    content: `Think about: ${plan}`,
    detail: "Consider your worst-placed piece and how to improve it.",
  };
}

function evaluatePosition(ctx: CoachContext): CoachMessage {
  const { fen, analysis } = ctx;
  const mat = countMaterial(fen);
  const evalStr = analysis
    ? formatEval(analysis.evaluation, analysis.mate)
    : "unclear";

  let who =
    mat.diff > 0
      ? `White is up ${mat.diff} pawn(s) in material`
      : mat.diff < 0
        ? `Black is up ${Math.abs(mat.diff)} pawn(s) in material`
        : "Material is equal";

  return {
    type: "evaluation",
    content: `Evaluation: **${evalStr}**. ${who}.`,
    detail: analysis?.lines[0]?.moves
      ? `Best continuation: ${analysis.lines[0].moves.slice(0, 4).join(" ")}`
      : "Keep your pieces active and king safe.",
  };
}

function evaluateProposedMove(san: string, ctx: CoachContext): CoachMessage {
  const { fen, analysis } = ctx;
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { type: "feedback", content: "Cannot evaluate — invalid position." };
  }

  try {
    const move = chess.move(san);
    const isCheck = chess.inCheck();
    const isCapture = !!move.captured;

    const bestMoveSAN =
      analysis?.bestMove && analysis.bestMove !== "(none)"
        ? uciToSan(fen, analysis.bestMove) ?? analysis.bestMove
        : null;

    const isBest = bestMoveSAN === move.san;

    if (isBest) {
      return {
        type: "praise",
        content: `Excellent! **${move.san}** is the engine's top choice! ${isCheck ? "And it gives check!" : ""}`,
        detail: "You found the best move in this position. Keep analysing candidate moves this way.",
        principle: "Pattern recognition: when you see a good move, look for a better one.",
      };
    }

    let feedback = `**${move.san}** is a legal move`;
    if (isCapture) feedback += " — a capture";
    if (isCheck) feedback += " that gives check";
    feedback += ".";

    return {
      type: "feedback",
      content: feedback,
      detail: bestMoveSAN
        ? `The engine prefers **${bestMoveSAN}** in this position. Can you see why?`
        : "Keep looking — there may be something stronger.",
      moves: bestMoveSAN ? [bestMoveSAN] : undefined,
    };
  } catch {
    return {
      type: "feedback",
      content: `**${san}** is not a legal move in this position. Double-check the square coordinates.`,
    };
  }
}

function blunderFeedback(
  moveSAN: string,
  cpLoss: number,
  ctx: CoachContext
): CoachMessage {
  const { fen, analysis } = ctx;
  const bestSAN =
    analysis?.bestMove && analysis.bestMove !== "(none)"
      ? uciToSan(fen, analysis.bestMove) ?? analysis.bestMove
      : null;

  return {
    type: "mistake",
    content: `**${moveSAN}** was a serious mistake (≈${(Math.abs(cpLoss) / 100).toFixed(1)} pawns lost).`,
    // `analysis` is for the position after the move, so its best move is the
    // opponent's strongest reply — the punishment for the mistake.
    detail: bestSAN
      ? `Your opponent can now answer with **${bestSAN}**. Before moving, check what your opponent threatens.`
      : "Look for checks, captures, and threats before playing quiet moves.",
    moves: bestSAN ? [bestSAN] : undefined,
    principle: "Before every move: 'What does my opponent threaten after this?'",
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function whatChanged(chess: Chess, san: string): string {
  if (san.includes("x")) return "a piece was captured, changing the material balance.";
  if (san.startsWith("O-O")) return "the king is now safer after castling.";
  if (san.includes("+")) return "the opponent is in check and must respond.";
  if (san.includes("=")) return "a pawn promoted — a major positional shift!";
  if (/^[a-h]/.test(san)) return "a pawn moved, shaping the structure.";
  return "piece activity shifted slightly.";
}

function planForTurn(chess: Chess, analysis: EngineAnalysis | undefined): string {
  const turn = chess.turn() === "w" ? "White" : "Black";
  const moves = chess.moves({ verbose: true });
  const captures = moves.filter((m) => m.captured);
  const checks = moves.filter((m) => m.san.includes("+"));
  const pawnMoves = moves.filter((m) => m.piece === "p");

  if (captures.length > 0 && checks.length > 0) {
    return `${turn} has both captures and checks available — evaluate the forcing moves first.`;
  }
  if (captures.length > 0) {
    return `${turn} has ${captures.length} capture(s) available. Check if any win material.`;
  }
  if (checks.length > 0) {
    return `${turn} can give check. See if it leads to a winning continuation.`;
  }

  const mat = countMaterial(chess.fen());
  if (Math.abs(mat.diff) >= 3) {
    const ahead = mat.diff > 0 ? "White" : "Black";
    return `${ahead} is ahead in material — simplify into a winning endgame.`;
  }

  return `${turn} should improve piece activity, control key squares, and prepare a pawn break.`;
}

function principleForPosition(
  chess: Chess,
  analysis: EngineAnalysis | undefined,
  mode: string | undefined
): string {
  if (mode === "endgames") {
    return "In endgames: activate your king! The king is a powerful piece.";
  }
  if (mode === "openings") {
    return "Opening goals: control the center, develop pieces, castle quickly.";
  }
  return chessPrinciple(chess);
}

function chessPrinciple(chess: Chess): string {
  const principles = [
    "Every move should have a purpose — improve a piece or create a threat.",
    "Control the center: d4, d5, e4, e5 are the key squares.",
    "Develop your pieces before launching an attack.",
    "Castle to keep your king safe and connect your rooks.",
    "Rooks belong on open files. Place them now.",
    "Knights are strongest in the center — find an outpost.",
    "Before exchanging, ask: does my opponent have a better piece than mine?",
    "Passed pawns must be pushed!",
    "Trade pawns to open lines for your bishops.",
    "Always think: what is my opponent threatening after my move?",
  ];
  return principles[Math.floor(Math.random() * principles.length)];
}

function detectTacticalTheme(chess: Chess): string | null {
  const moves = chess.moves({ verbose: true });
  const checks = moves.filter((m) => m.san.includes("+"));
  if (checks.length >= 2) return "double check or discovered check";

  const captures = moves.filter((m) => m.captured);
  if (captures.length >= 3) return "tactic";

  return null;
}

function themeExplanation(theme: string): string {
  const explanations: Record<string, string> = {
    "double check or discovered check":
      "A discovered check happens when you move a piece and the piece behind it gives check. Double check forces the king to move.",
    tactic:
      "With multiple captures available, look for the one that wins the most material or creates the biggest threat.",
    pin: "A pin immobilises a piece because moving it would expose a more valuable piece behind it.",
    fork: "A fork attacks two pieces at once. Knights are especially good at this.",
    skewer: "A skewer is like a reverse pin — the valuable piece is forced to move, exposing the piece behind it.",
  };
  return (
    explanations[theme] ?? "This tactical theme can win material or give a decisive advantage."
  );
}

function drawReason(chess: Chess): string {
  if (chess.isStalemate()) return "Stalemate — the side to move has no legal moves.";
  if (chess.isInsufficientMaterial())
    return "Insufficient material — neither side has enough pieces to force checkmate.";
  if (chess.isThreefoldRepetition())
    return "Threefold repetition — the same position occurred three times.";
  return "The game ended in a draw by the 50-move rule or agreement.";
}

function whyBetterMove(ctx: CoachContext): string {
  const { analysis, fen } = ctx;
  if (!analysis?.bestMove) return "improves your position significantly";
  const san = uciToSan(fen, analysis.bestMove);
  if (!san) return "is a stronger option";
  if (san.includes("+")) return "gives check with tempo";
  if (san.includes("x")) return "wins material";
  if (/^[NBRQ]/.test(san)) return "activates a key piece";
  return "creates a stronger threat";
}
