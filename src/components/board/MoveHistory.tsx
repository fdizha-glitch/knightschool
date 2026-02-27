"use client";

import { useEffect, useRef } from "react";

interface MoveHistoryProps {
  history: string[];
  onSelectMove?: (index: number) => void;
  currentIndex?: number;
  className?: string;
}

export function MoveHistory({
  history,
  onSelectMove,
  currentIndex,
  className = "",
}: MoveHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  if (history.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-sm italic p-4 ${className}`}
      >
        No moves yet
      </div>
    );
  }

  // Pair moves into [white, black] groups
  const pairs: Array<{ white: string; black?: string; idx: [number, number?] }> =
    [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      white: history[i],
      black: history[i + 1],
      idx: [i, history[i + 1] !== undefined ? i + 1 : undefined],
    });
  }

  return (
    <div
      className={`overflow-y-auto font-mono text-sm ${className}`}
      style={{ maxHeight: "200px" }}
    >
      <div className="space-y-0.5 p-2">
        {pairs.map((pair, num) => (
          <div key={num} className="flex items-center gap-1">
            <span className="text-zinc-500 dark:text-zinc-600 w-7 shrink-0 text-right">
              {num + 1}.
            </span>
            <MoveToken
              san={pair.white}
              index={pair.idx[0]}
              isActive={currentIndex === pair.idx[0]}
              onClick={onSelectMove}
            />
            {pair.black !== undefined && (
              <MoveToken
                san={pair.black}
                index={pair.idx[1]!}
                isActive={currentIndex === pair.idx[1]}
                onClick={onSelectMove}
              />
            )}
          </div>
        ))}
      </div>
      <div ref={endRef} />
    </div>
  );
}

function MoveToken({
  san,
  index,
  isActive,
  onClick,
}: {
  san: string;
  index: number;
  isActive?: boolean;
  onClick?: (index: number) => void;
}) {
  return (
    <button
      onClick={() => onClick?.(index)}
      className={[
        "px-1.5 py-0.5 rounded transition-colors min-w-[52px] text-left",
        isActive
          ? "bg-brand text-white"
          : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        onClick ? "cursor-pointer" : "cursor-default",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {san}
    </button>
  );
}
