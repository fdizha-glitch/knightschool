import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// Only instantiate client if key is available (prevent startup errors)
let openaiClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Add it to .env.local");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided. Attach audio as multipart field 'audio'." },
        { status: 400 }
      );
    }

    if (audioFile.size < 500) {
      return NextResponse.json(
        { error: "Audio file is too short. Please record at least 1 second." },
        { status: 400 }
      );
    }

    const client = getClient();

    // Determine file extension from MIME type
    const mimeType = audioFile.type || "audio/webm";
    const ext = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
        ? "mp4"
        : mimeType.includes("wav")
          ? "wav"
          : "webm";

    // Convert Blob to File (OpenAI SDK needs a File with a name)
    const file = new File([audioFile], `recording.${ext}`, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    return NextResponse.json({
      text: transcription.text,
      confidence: null, // Whisper JSON format doesn't expose confidence at top level
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    console.error("[/api/transcribe]", err);

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
