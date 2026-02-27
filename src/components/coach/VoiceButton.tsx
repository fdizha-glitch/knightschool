"use client";

import { useEffect, useRef } from "react";
import { useVoice } from "@/hooks/useVoice";
import { Button } from "@/components/ui/Button";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const {
    status,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
    setTranscript,
  } = useVoice();

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when transcript arrives
  useEffect(() => {
    if (transcript && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [transcript]);

  function handleSend() {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      clearTranscript();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isSupported) {
    return (
      <div className="text-xs text-zinc-400 italic">
        Voice input not supported in this browser.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Mic button */}
      <div className="flex items-center gap-2">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={isRecording ? cancelRecording : undefined}
          onTouchStart={(e) => {
            e.preventDefault();
            startRecording();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? "Recording — release to transcribe" : "Hold to speak"}
          className={[
            "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 select-none",
            isRecording
              ? "bg-red-500 shadow-lg shadow-red-500/40 scale-110 animate-pulse-soft"
              : "bg-brand hover:bg-brand-dark shadow-sm shadow-brand/30",
            (disabled || isTranscribing) ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isTranscribing ? (
            <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          {isRecording && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
          )}
        </button>

        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {isRecording
              ? "Recording…"
              : isTranscribing
                ? "Transcribing…"
                : "Hold to talk"}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {"Ask: \"Why?\", \"What's the plan?\", \"I think Nc6\""}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Transcript editor */}
      {transcript && (
        <div className="flex flex-col gap-1.5 animate-slide-in">
          <textarea
            ref={textareaRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Edit your message…"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={clearTranscript}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleSend}
              disabled={!transcript.trim()}
            >
              Ask coach
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
