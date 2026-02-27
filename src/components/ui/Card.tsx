"use client";

import React from "react";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({
  className = "",
  children,
  title,
  subtitle,
  headerAction,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={[
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || headerAction) && (
        <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            {title && (
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0 ml-3">{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}

export function CardStat({
  label,
  value,
  sub,
  color = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "default" | "green" | "red" | "blue" | "purple";
}) {
  const colorMap = {
    default: "text-zinc-900 dark:text-zinc-100",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="flex flex-col">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-2xl font-bold mt-0.5 ${colorMap[color]}`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {sub}
        </span>
      )}
    </div>
  );
}
