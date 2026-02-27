import { NextRequest, NextResponse } from "next/server";
import { generateCoachMessage, type CoachContext } from "@/lib/coach/coaching";
import type { CoachMessage, EngineAnalysis } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fen,
      lastMoveSAN,
      analysis,
      previousEval,
      voiceInput,
      mode,
    } = body as {
      fen?: string;
      lastMoveSAN?: string;
      analysis?: EngineAnalysis;
      previousEval?: number;
      voiceInput?: string;
      mode?: CoachContext["mode"];
    };

    if (!fen || typeof fen !== "string") {
      return NextResponse.json(
        { error: "Missing 'fen' field." },
        { status: 400 }
      );
    }

    const ctx: CoachContext = {
      fen,
      lastMoveSAN: lastMoveSAN ?? undefined,
      analysis: analysis ?? undefined,
      voiceInput: voiceInput ?? undefined,
      mode: mode ?? undefined,
      previousEval: previousEval ?? 0,
    };

    // Optional: enhance with LLM if ENABLE_LLM_COACH=true and OPENAI_API_KEY is set
    let message: CoachMessage;

    if (
      process.env.ENABLE_LLM_COACH === "true" &&
      process.env.OPENAI_API_KEY &&
      voiceInput
    ) {
      message = await llmEnhancedCoach(ctx);
    } else {
      message = generateCoachMessage(ctx);
    }

    return NextResponse.json(message);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Coach request failed";
    console.error("[/api/coach]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Optional LLM-Enhanced Coaching ───────────────────────────────────────

async function llmEnhancedCoach(ctx: CoachContext): Promise<CoachMessage> {
  // Base rule-based message first
  const base = generateCoachMessage(ctx);

  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a concise, encouraging chess coach.
The student is playing in ${ctx.mode ?? "free play"} mode.
Current FEN: ${ctx.fen}
${ctx.lastMoveSAN ? `Last move: ${ctx.lastMoveSAN}` : ""}
${ctx.analysis ? `Engine evaluation: ${(ctx.analysis.evaluation / 100).toFixed(2)} pawns` : ""}

Respond in 1-2 short sentences. Be practical, specific, and encouraging.
Do not mention evaluation numbers unless asked. Focus on plans and principles.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ctx.voiceInput! },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const enhanced = completion.choices[0]?.message?.content ?? base.content;
    return { ...base, content: enhanced };
  } catch (err) {
    console.warn("[/api/coach] LLM fallback to rule-based:", err);
    return base;
  }
}
