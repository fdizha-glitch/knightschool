"use client";

import { useState } from "react";
import type { CoachMessage } from "@/types";
import { useGameStore } from "@/lib/store/game-store";
import { useCoach } from "@/hooks/useCoach";
import { useSettingsStore } from "@/lib/store/settings-store";
import { VoiceButton } from "./VoiceButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const TYPE_ICON: Record<CoachMessage["type"], string> = {
  evaluation: "📊",
  plan: "🗺️",
  principle: "💡",
  tactic: "⚡",
  feedback: "💬",
  hint: "🔍",
  mistake: "⚠️",
  praise: "🌟",
};

const TYPE_COLOR: Record<CoachMessage["type"], string> = {
  evaluation: "border-blue-500/30 bg-blue-50 dark:bg-blue-950/20",
  plan: "border-violet-500/30 bg-violet-50 dark:bg-violet-950/20",
  principle: "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20",
  tactic: "border-orange-500/30 bg-orange-50 dark:bg-orange-950/20",
  feedback: "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900",
  hint: "border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20",
  mistake: "border-red-400/40 bg-red-50 dark:bg-red-950/20",
  praise: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20",
};

interface CoachPanelProps {
  className?: string;
}

export function CoachPanel({ className = "" }: CoachPanelProps) {
  const { coachMessages, clearCoachMessages } = useGameStore();
  const { isLoading, askCoach, getHint } = useCoach();
  const { settings } = useSettingsStore();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpand(idx: number) {
    setExpanded((s) => {
      const next = new Set(s);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <Card
      className={className}
      title="Coach"
      subtitle="Ask anything about the position"
      headerAction={
        coachMessages.length > 0 ? (
          <button
            onClick={clearCoachMessages}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {/* Messages */}
        {coachMessages.length === 0 ? (
          <div className="text-sm text-zinc-400 dark:text-zinc-500 italic text-center py-3">
            Make a move or ask a question to get coaching feedback.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {coachMessages.map((msg, idx) => (
              <CoachMessageCard
                key={idx}
                msg={msg}
                isExpanded={expanded.has(idx)}
                onToggle={() => toggleExpand(idx)}
              />
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="xs"
            loading={isLoading}
            onClick={() => askCoach()}
            icon={<span>📊</span>}
          >
            Analyse
          </Button>
          <Button
            variant="outline"
            size="xs"
            loading={isLoading}
            onClick={() => getHint()}
            icon={<span>🔍</span>}
          >
            Hint
          </Button>
          <Button
            variant="outline"
            size="xs"
            loading={isLoading}
            onClick={() => askCoach("What is the plan?")}
            icon={<span>🗺️</span>}
          >
            Plan
          </Button>
        </div>

        {/* Voice input */}
        {settings.voiceEnabled && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <VoiceButton
              onTranscript={(text) => askCoach(text)}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function CoachMessageCard({
  msg,
  isExpanded,
  onToggle,
}: {
  msg: CoachMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const icon = TYPE_ICON[msg.type];
  const colorClass = TYPE_COLOR[msg.type];
  const hasDetail = !!msg.detail || !!msg.principle;

  // Simple markdown-bold renderer: **text** → <strong>text</strong>
  function renderContent(text: string) {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 text-sm transition-all duration-150 animate-slide-in ${colorClass}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-800 dark:text-zinc-200 leading-snug">
            {renderContent(msg.content)}
          </p>

          {isExpanded && (
            <div className="mt-2 space-y-1.5">
              {msg.detail && (
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                  {renderContent(msg.detail)}
                </p>
              )}
              {msg.principle && (
                <p className="text-xs text-amber-700 dark:text-amber-400 italic border-l-2 border-amber-400 pl-2">
                  {msg.principle}
                </p>
              )}
              {msg.moves && msg.moves.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {msg.moves.map((m) => (
                    <span
                      key={m}
                      className="font-mono text-xs bg-brand/10 text-brand dark:text-brand-light px-2 py-0.5 rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {hasDetail && (
          <button
            onClick={onToggle}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0 transition-colors"
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        )}
      </div>
    </div>
  );
}
