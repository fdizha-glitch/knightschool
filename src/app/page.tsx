import Link from "next/link";

const MODES = [
  {
    href: "/openings",
    icon: "♟",
    title: "Openings",
    description:
      "Drill your repertoire move by move. Learn the plans behind every variation.",
    color: "from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800/30",
    badge: "Spaced repetition",
  },
  {
    href: "/middlegame",
    icon: "⚡",
    title: "Tactics & Plans",
    description:
      "Curated positions tagged by theme: pins, forks, outposts, pawn breaks, and more.",
    color: "from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-800/30",
    badge: "15 positions",
  },
  {
    href: "/endgames",
    icon: "♔",
    title: "Endgames",
    description:
      "Master essential endgame technique — Lucena, Philidor, opposition, and minor pieces.",
    color: "from-teal-500/10 to-cyan-500/10 border-teal-200 dark:border-teal-800/30",
    badge: "10 positions",
  },
  {
    href: "/review",
    icon: "📋",
    title: "Review Mistakes",
    description:
      "Replay your errors, compare candidate moves, and fix the patterns that trip you up.",
    color: "from-red-500/10 to-rose-500/10 border-red-200 dark:border-red-800/30",
    badge: "Progress tracking",
  },
] as const;

const FEATURES = [
  {
    icon: "🎙",
    title: "Voice Coaching",
    body: 'Say "What\'s the plan?" or "Why is this bad?" and get instant feedback. Powered by Whisper STT.',
  },
  {
    icon: "🔬",
    title: "Engine Analysis",
    body: "Stockfish provides best-move suggestions, evaluation bar, and top-3 candidate lines.",
  },
  {
    icon: "📈",
    title: "Progress Tracking",
    body: "Track accuracy, streaks, and opening recall. Review your mistakes to improve fastest.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <div className="text-6xl mb-4">♞</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Knight<span className="text-brand">School</span>
        </h1>
        <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Your interactive chess tutor. Engine analysis, voice coaching, and
          targeted drills — all in one place.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/openings"
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors shadow-sm shadow-brand/30"
          >
            Start Training
            <span>→</span>
          </Link>
          <Link
            href="/review"
            className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium px-6 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Review Mistakes
          </Link>
        </div>
      </section>

      {/* Mode cards */}
      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Choose a Mode
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODES.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              className={`group relative rounded-2xl border bg-gradient-to-br p-5 hover:shadow-md transition-all duration-150 ${mode.color}`}
            >
              <div className="text-3xl mb-3">{mode.icon}</div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                  {mode.title}
                </h3>
                <span className="text-xs bg-zinc-900/8 dark:bg-white/8 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                  {mode.badge}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                {mode.description}
              </p>
              <div className="absolute top-4 right-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="grid sm:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm"
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {f.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      {/* Quick tip */}
      <section className="rounded-2xl bg-brand/5 border border-brand/20 p-5 flex items-start gap-4">
        <span className="text-2xl shrink-0">💡</span>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Quick Tip
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The fastest way to improve is to <strong>review your mistakes</strong>. After each session, visit the Review page to replay errors and understand the correct ideas. Combine this with opening drills for rapid progress.
          </p>
        </div>
      </section>
    </div>
  );
}
