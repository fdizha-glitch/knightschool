"use client";

import { useCallback, useRef, useState } from "react";
import {
  isRecordingSupported,
  getSupportedMimeType,
  transcribeAudio,
} from "@/lib/utils/audio";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "error";

interface VoiceHook {
  status: VoiceStatus;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  clearTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useVoice(): VoiceHook {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = isRecordingSupported();

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      setStatus("recording");
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // Collect in 100ms chunks
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Microphone access denied. Check browser permissions."
      );
    }
  }, [isSupported]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          setStatus("idle");
          resolve();
          return;
        }

        setStatus("transcribing");
        try {
          const text = await transcribeAudio(blob);
          setTranscript(text);
          setStatus("idle");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Transcription failed"
          );
          setStatus("error");
        }
        resolve();
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    chunksRef.current = [];
    setStatus("idle");
    setError(null);
  }, []);

  const clearTranscript = useCallback(() => setTranscript(""), []);

  return {
    status,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
    setTranscript,
  };
}
