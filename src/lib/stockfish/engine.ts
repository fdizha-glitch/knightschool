import { Chess } from "chess.js";
import type { EngineAnalysis, PVLine } from "@/types";

// Stockfish 19 "lite, single-threaded" WASM build, served from /public.
// Single-threaded needs no cross-origin isolation headers, so it runs on any
// static host (Vercel, Netlify, GitHub Pages…). Licensed GPL-3.0 — see
// public/stockfish/COPYING.txt.
const ENGINE_URL = "/stockfish/stockfish-19-lite-single.js";
const STARTUP_TIMEOUT_MS = 15000;
const SEARCH_TIMEOUT_MS = 12000;

/** Mate scores are folded into centipawns so evaluations stay comparable:
 *  mate in N for White = MATE_CP - N, for Black = -(MATE_CP - N). */
export const MATE_CP = 10000;

interface UCIParsedLine {
  type: "info" | "bestmove" | "other";
  depth?: number;
  multipv?: number;
  cp?: number;
  mate?: number;
  pv?: string[];
  bestMove?: string;
}

function parseUCILine(line: string): UCIParsedLine {
  if (line.startsWith("bestmove")) {
    const parts = line.split(" ");
    return { type: "bestmove", bestMove: parts[1] };
  }
  if (!line.startsWith("info")) return { type: "other" };

  const result: UCIParsedLine = { type: "info" };

  const depthM = line.match(/\bdepth (\d+)/);
  if (depthM) result.depth = parseInt(depthM[1]);

  const mpvM = line.match(/\bmultipv (\d+)/);
  if (mpvM) result.multipv = parseInt(mpvM[1]);

  const cpM = line.match(/\bscore cp (-?\d+)/);
  if (cpM) result.cp = parseInt(cpM[1]);

  const mateM = line.match(/\bscore mate (-?\d+)/);
  if (mateM) result.mate = parseInt(mateM[1]);

  const pvM = line.match(/\bpv (.+)$/);
  if (pvM) result.pv = pvM[1].trim().split(" ");

  return result;
}

/** Convert a UCI score (relative to the side to move) into White's point of
 *  view, which is what the eval bar, coach and trainers all expect. */
function toWhitePerspective(
  parsed: UCIParsedLine,
  sideSign: 1 | -1
): { evaluation: number; mate: number | null } {
  if (parsed.mate !== undefined) {
    if (parsed.mate === 0) {
      // Side to move is checkmated.
      return { evaluation: -sideSign * MATE_CP, mate: 0 };
    }
    const mate = parsed.mate * sideSign;
    return {
      evaluation: Math.sign(mate) * (MATE_CP - Math.abs(mate)),
      mate,
    };
  }
  return { evaluation: (parsed.cp ?? 0) * sideSign, mate: null };
}

// ─── Worker wrapper ────────────────────────────────────────────────────────

class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private searching = false;
  private listener: ((line: string) => void) | null = null;
  private onCrash: ((err: Error) => void) | null = null;

  private init(): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = new Promise<void>((resolve, reject) => {
      if (typeof Worker === "undefined") {
        reject(new Error("Web Workers are not available"));
        return;
      }

      let worker: Worker;
      try {
        worker = new Worker(ENGINE_URL);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Stockfish failed to load"));
        return;
      }
      this.worker = worker;

      const timer = setTimeout(
        () => reject(new Error("Stockfish failed to start in time")),
        STARTUP_TIMEOUT_MS
      );

      worker.onmessage = (e: MessageEvent) => {
        const line = String(e.data);
        if (line === "uciok") {
          clearTimeout(timer);
          resolve();
        }
        this.listener?.(line);
      };

      worker.onerror = (e: ErrorEvent) => {
        clearTimeout(timer);
        const err = new Error(e.message || "Stockfish worker error");
        reject(err);
        // Mark the engine dead so later calls go straight to the fallback.
        worker.terminate();
        this.worker = null;
        this.ready = Promise.reject(err);
        this.ready.catch(() => undefined);
        this.onCrash?.(err);
      };

      worker.postMessage("uci");
    });

    return this.ready;
  }

  private post(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  /** Analyse a position. Calls are serialised; starting a new analysis stops
   *  the one in progress, which then resolves early with what it has. */
  analyze(fen: string, depth: number, multiPV: number): Promise<EngineAnalysis> {
    if (this.searching) this.post("stop");

    const run = () => this.search(fen, depth, multiPV);
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async search(
    fen: string,
    depth: number,
    multiPV: number
  ): Promise<EngineAnalysis> {
    await this.init();

    return new Promise<EngineAnalysis>((resolve, reject) => {
      const sideSign: 1 | -1 = fen.split(" ")[1] === "b" ? -1 : 1;
      const pvLines = new Map<number, PVLine>();
      this.searching = true;

      const finish = () => {
        clearTimeout(timer);
        clearTimeout(deadline);
        this.searching = false;
        this.listener = null;
        this.onCrash = null;
      };

      // If the search runs long, ask for the best move found so far…
      const timer = setTimeout(() => this.post("stop"), SEARCH_TIMEOUT_MS);
      // …and give up entirely if the engine never answers.
      const deadline = setTimeout(() => {
        finish();
        reject(new Error("Stockfish did not respond"));
      }, SEARCH_TIMEOUT_MS + 5000);

      this.onCrash = (err) => {
        finish();
        reject(err);
      };

      this.listener = (line) => {
        const parsed = parseUCILine(line);

        if (parsed.type === "info" && parsed.pv) {
          const key = parsed.multipv ?? 1;
          const existing = pvLines.get(key);
          if (!existing || (parsed.depth ?? 0) >= existing.depth) {
            pvLines.set(key, {
              moves: parsed.pv,
              ...toWhitePerspective(parsed, sideSign),
              depth: parsed.depth ?? 0,
            });
          }
        } else if (parsed.type === "info" && parsed.mate === 0) {
          // Checkmated position: Stockfish reports "score mate 0" with no pv.
          pvLines.set(1, {
            moves: [],
            ...toWhitePerspective(parsed, sideSign),
            depth: 0,
          });
        }

        if (parsed.type === "bestmove") {
          finish();
          const lines = Array.from(pvLines.entries())
            .sort(([a], [b]) => a - b)
            .map(([, line]) => line)
            .slice(0, multiPV);
          const top = lines[0];

          resolve({
            bestMove: parsed.bestMove ?? "(none)",
            evaluation: top?.evaluation ?? 0,
            mate: top?.mate ?? null,
            lines,
            depth: top?.depth ?? 0,
            source: "stockfish",
          });
        }
      };

      this.post(`setoption name MultiPV value ${multiPV}`);
      this.post(`position fen ${fen}`);
      this.post(`go depth ${depth}`);
    });
  }
}

let engine: StockfishEngine | null = null;
let warnedFallback = false;

/** Analyse a position in the browser with Stockfish WASM. Falls back to a
 *  basic material-based analysis if the engine cannot be loaded. */
export async function analyzePosition(
  fen: string,
  depth = 15,
  multiPV = 3
): Promise<EngineAnalysis> {
  engine ??= new StockfishEngine();
  try {
    return await engine.analyze(fen, depth, multiPV);
  } catch (err) {
    if (!warnedFallback) {
      console.warn("[stockfish] Engine unavailable, using basic fallback:", err);
      warnedFallback = true;
    }
    return fallbackAnalysis(fen);
  }
}

// ─── Fallback ──────────────────────────────────────────────────────────────

const PIECE_VALUES: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

function materialEval(chess: Chess): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq) score += (sq.color === "w" ? 1 : -1) * PIECE_VALUES[sq.type];
    }
  }
  return score;
}

/** Lightweight fallback when the WASM engine is unavailable: one-ply search
 *  on material, preferring checkmate. Weak, but plays legal, sensible moves. */
export function fallbackAnalysis(fen: string): EngineAnalysis {
  const empty: EngineAnalysis = {
    bestMove: "(none)",
    evaluation: 0,
    mate: null,
    lines: [],
    depth: 0,
    source: "fallback",
  };

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return empty;
  }

  const sideSign = chess.turn() === "w" ? 1 : -1;

  if (chess.isGameOver()) {
    return chess.isCheckmate()
      ? { ...empty, evaluation: -sideSign * MATE_CP, mate: 0 }
      : empty;
  }

  let best: { uci: string; score: number } | null = null;
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move);
    const score = chess.isCheckmate()
      ? sideSign * MATE_CP
      : chess.isDraw()
        ? 0
        : materialEval(chess);
    chess.undo();

    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    if (!best || score * sideSign > best.score * sideSign) {
      best = { uci, score };
    }
  }

  if (!best) return empty;

  const evaluation = materialEval(chess);
  return {
    ...empty,
    bestMove: best.uci,
    evaluation,
    lines: [{ moves: [best.uci], evaluation, mate: null, depth: 1 }],
    depth: 1,
  };
}
