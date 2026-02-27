import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KnightSchool — Interactive Chess Tutor",
  description:
    "Learn chess openings, middlegames, and endgames with engine analysis and voice coaching.",
};

const NAV_LINKS = [
  { href: "/openings", label: "Openings", icon: "♟" },
  { href: "/middlegame", label: "Tactics", icon: "⚡" },
  { href: "/endgames", label: "Endgames", icon: "♔" },
  { href: "/review", label: "Review", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && system)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-100 hover:text-brand dark:hover:text-brand-light transition-colors"
              >
                <span className="text-2xl">♞</span>
                <span>KnightSchool</span>
              </Link>

              {/* Navigation */}
              <nav className="hidden sm:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    <span>{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile nav */}
            <div className="sm:hidden border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-1 overflow-x-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
            KnightSchool — powered by Stockfish & Whisper
          </footer>
        </div>
      </body>
    </html>
  );
}
