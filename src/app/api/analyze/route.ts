import { NextRequest, NextResponse } from "next/server";
import {
  analyzePosition,
  fallbackAnalysis,
} from "@/lib/stockfish/engine";
import type { EngineAnalysis } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fen, depth = 15, multiPV = 3 } = body as {
      fen?: string;
      depth?: number;
      multiPV?: number;
    };

    if (!fen || typeof fen !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'fen' field." },
        { status: 400 }
      );
    }

    const safeDepth = Math.max(1, Math.min(25, depth));
    const safeMPV = Math.max(1, Math.min(5, multiPV));

    let analysis: EngineAnalysis;

    try {
      analysis = await analyzePosition(fen, safeDepth, safeMPV);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";

      if (msg === "STOCKFISH_NOT_FOUND") {
        // Graceful fallback — basic analysis without engine
        console.warn(
          "[/api/analyze] Stockfish binary not found. Using fallback analysis. " +
            "Install stockfish: `apt install stockfish` or `brew install stockfish`"
        );
        analysis = fallbackAnalysis(fen);
        return NextResponse.json({
          ...analysis,
          _warning:
            "Stockfish binary not found. Install it for full analysis. Using basic fallback.",
        });
      }

      throw err;
    }

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
