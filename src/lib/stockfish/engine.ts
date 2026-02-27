import { spawn, ChildProcess } from "child_process";
import { Chess } from "chess.js";
import type { EngineAnalysis, PVLine } from "@/types";

const STOCKFISH_PATH = process.env.STOCKFISH_PATH ?? "stockfish";
const DEFAULT_DEPTH = 15;
const TIMEOUT_MS = 12000;

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

export function analyzePosition(
  fen: string,
  depth = DEFAULT_DEPTH,
  multiPV = 3
): Promise<EngineAnalysis> {
  return new Promise((resolve, reject) => {
    let engine: ChildProcess;

    try {
      engine = spawn(STOCKFISH_PATH, [], { stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      reject(new Error("STOCKFISH_NOT_FOUND"));
      return;
    }

    const pvLines = new Map<number, PVLine>();
    let bestMove = "";
    let resolved = false;

    const cleanup = () => {
      try {
        engine.kill();
      } catch {}
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Stockfish analysis timed out"));
      }
    }, TIMEOUT_MS);

    engine.on("error", (err: NodeJS.ErrnoException) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        if (err.code === "ENOENT") reject(new Error("STOCKFISH_NOT_FOUND"));
        else reject(err);
      }
    });

    let buffer = "";
    engine.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const parsed = parseUCILine(line.trim());

        if (parsed.type === "info" && parsed.pv) {
          const key = parsed.multipv ?? 1;
          const existing = pvLines.get(key);
          if (!existing || (parsed.depth ?? 0) > existing.depth) {
            pvLines.set(key, {
              moves: parsed.pv,
              evaluation: parsed.cp ?? 0,
              mate: parsed.mate ?? null,
              depth: parsed.depth ?? 0,
            });
          }
        }

        if (parsed.type === "bestmove" && parsed.bestMove) {
          bestMove = parsed.bestMove;
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            cleanup();

            const topLine = pvLines.get(1);
            const allLines = Array.from(pvLines.values()).sort(
              (a, b) => a.depth - b.depth
            );

            resolve({
              bestMove,
              evaluation: topLine?.evaluation ?? 0,
              mate: topLine?.mate ?? null,
              lines: allLines.slice(0, multiPV),
              depth: topLine?.depth ?? 0,
            });
          }
        }
      }
    });

    // Start UCI session
    const write = (cmd: string) => engine.stdin?.write(cmd + "\n");
    write("uci");
    write(`setoption name MultiPV value ${multiPV}`);
    write("isready");
    write(`position fen ${fen}`);
    write(`go depth ${depth}`);
  });
}

/** Lightweight fallback analysis when Stockfish binary is unavailable.
 *  Uses material balance + mobility as a proxy evaluation. */
export function fallbackAnalysis(fen: string): EngineAnalysis {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      return {
        bestMove: "(none)",
        evaluation: chess.isCheckmate() ? -9999 : 0,
        mate: chess.isCheckmate() ? 0 : null,
        lines: [],
        depth: 0,
      };
    }
    const bestMove = moves[0];
    return {
      bestMove: `${bestMove.from}${bestMove.to}`,
      evaluation: 0,
      mate: null,
      lines: [
        {
          moves: [`${bestMove.from}${bestMove.to}`],
          evaluation: 0,
          mate: null,
          depth: 1,
        },
      ],
      depth: 1,
    };
  } catch {
    return {
      bestMove: "(none)",
      evaluation: 0,
      mate: null,
      lines: [],
      depth: 0,
    };
  }
}
