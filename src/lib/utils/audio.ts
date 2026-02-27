"use client";

export type AudioRecorderState = "idle" | "recording" | "processing" | "error";

export interface AudioRecorder {
  state: AudioRecorderState;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

/** Check if the browser supports audio recording */
export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Get a supported MIME type for recording */
export function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/** Convert audio blob to base64 (for edge cases) */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Send audio blob to the /api/transcribe endpoint */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const mimeType = blob.type || "audio/webm";
  const ext = mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4")
      ? "mp4"
      : "webm";

  const formData = new FormData();
  formData.append("audio", blob, `recording.${ext}`);

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Transcription failed");
  }

  const data = await res.json();
  return data.text ?? "";
}

/** Speak text aloud using the Web Speech API */
export function speakText(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  } = {}
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  window.speechSynthesis.cancel(); // Stop any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 0.9;
  utterance.lang = options.lang ?? "en-US";

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/** Stop any ongoing TTS */
export function stopSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
