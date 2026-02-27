"use client";

import type React from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useProgressStore } from "@/lib/store/progress-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { clearMistakes } = useProgressStore();

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Customise your training experience.
        </p>
      </div>

      {/* Board & Appearance */}
      <Card title="Board & Appearance">
        <div className="space-y-5">
          <SettingRow label="Theme" description="Interface colour scheme">
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as "light" | "dark" | "system" })}
              className="select-field"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </SettingRow>

          <SettingRow label="Default Side" description="Which colour to play as">
            <select
              value={settings.defaultColor}
              onChange={(e) => updateSettings({ defaultColor: e.target.value as "white" | "black" })}
              className="select-field"
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </SettingRow>

          <SettingRow label="Animation Speed" description="Board animation duration">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={500}
                step={50}
                value={settings.animationSpeed}
                onChange={(e) => updateSettings({ animationSpeed: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zinc-500 w-12">{settings.animationSpeed}ms</span>
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* Engine */}
      <Card title="Engine Analysis">
        <div className="space-y-5">
          <SettingRow
            label="Show Eval Bar"
            description="Display the evaluation bar on the board"
          >
            <Toggle
              checked={settings.showEvalBar}
              onChange={(v) => updateSettings({ showEvalBar: v })}
            />
          </SettingRow>

          <SettingRow
            label="Show Best Move"
            description="Display the engine's top move arrow automatically"
          >
            <Toggle
              checked={settings.showBestMove}
              onChange={(v) => updateSettings({ showBestMove: v })}
            />
          </SettingRow>

          <SettingRow
            label="Engine Depth"
            description="Stronger = slower. 15 is the sweet spot."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={settings.engineDepth}
                onChange={(e) => updateSettings({ engineDepth: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zinc-500 w-8">{settings.engineDepth}</span>
            </div>
          </SettingRow>

          <SettingRow
            label="Analysis Lines"
            description="How many candidate moves to show"
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={settings.engineLines}
                onChange={(e) => updateSettings({ engineLines: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-zinc-500 w-4">{settings.engineLines}</span>
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* Voice */}
      <Card title="Voice Coaching">
        <div className="space-y-5">
          <SettingRow
            label="Voice Input (STT)"
            description="Enable microphone for voice questions"
          >
            <Toggle
              checked={settings.voiceEnabled}
              onChange={(v) => updateSettings({ voiceEnabled: v })}
            />
          </SettingRow>

          <SettingRow
            label="Text-to-Speech"
            description="Speak coach responses aloud"
          >
            <Toggle
              checked={settings.ttsEnabled}
              onChange={(v) => updateSettings({ ttsEnabled: v })}
            />
          </SettingRow>
        </div>
      </Card>

      {/* API Keys info */}
      <Card title="API Configuration">
        <div className="space-y-3">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 text-sm">
            <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
              Whisper STT requires an OpenAI API key
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              Add <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded font-mono">OPENAI_API_KEY=sk-...</code> to{" "}
              <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded font-mono">.env.local</code> in the project root and restart the server.
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 text-sm">
            <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
              Stockfish engine requires the binary
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              Install: <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded font-mono">apt install stockfish</code> or{" "}
              <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded font-mono">brew install stockfish</code>. A fallback analysis is provided if not found.
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 p-4 text-sm">
            <p className="font-medium text-violet-800 dark:text-violet-300 mb-1">
              Optional: GPT-4 enhanced coaching
            </p>
            <p className="text-violet-600 dark:text-violet-400 text-xs leading-relaxed">
              Set <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded font-mono">ENABLE_LLM_COACH=true</code> in{" "}
              <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded font-mono">.env.local</code> to use GPT-4o-mini for richer voice responses.
            </p>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card title="Data">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Reset all settings to defaults?")) resetSettings();
            }}
          >
            Reset settings
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm("Delete all recorded mistakes? This cannot be undone."))
                clearMistakes();
            }}
          >
            Clear mistake history
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        checked
          ? "bg-brand"
          : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
