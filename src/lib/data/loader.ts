import type { Opening, MiddlegamePosition, EndgamePosition } from "@/types";

// ─── Data Cache ────────────────────────────────────────────────────────────

let _openings: Opening[] | null = null;
let _middlegamePositions: MiddlegamePosition[] | null = null;
let _endgamePositions: EndgamePosition[] | null = null;

// ─── Loaders ───────────────────────────────────────────────────────────────

export async function loadOpenings(): Promise<Opening[]> {
  if (_openings) return _openings;
  const data = await import("../../../data/openings.json");
  _openings = data.default as Opening[];
  return _openings;
}

export async function loadMiddlegamePositions(): Promise<MiddlegamePosition[]> {
  if (_middlegamePositions) return _middlegamePositions;
  const data = await import("../../../data/middlegame-positions.json");
  _middlegamePositions = data.default as MiddlegamePosition[];
  return _middlegamePositions;
}

export async function loadEndgamePositions(): Promise<EndgamePosition[]> {
  if (_endgamePositions) return _endgamePositions;
  const data = await import("../../../data/endgame-positions.json");
  _endgamePositions = data.default as EndgamePosition[];
  return _endgamePositions;
}

// ─── Selectors ─────────────────────────────────────────────────────────────

export async function getOpeningById(id: string): Promise<Opening | undefined> {
  const openings = await loadOpenings();
  return openings.find((o) => o.id === id);
}

export async function getMiddlegameById(
  id: string
): Promise<MiddlegamePosition | undefined> {
  const positions = await loadMiddlegamePositions();
  return positions.find((p) => p.id === id);
}

export async function getEndgameById(
  id: string
): Promise<EndgamePosition | undefined> {
  const positions = await loadEndgamePositions();
  return positions.find((p) => p.id === id);
}

export async function getMiddlegameByTheme(
  theme: string
): Promise<MiddlegamePosition[]> {
  const positions = await loadMiddlegamePositions();
  return positions.filter((p) => p.theme.includes(theme));
}

export async function getRandomMiddlegame(
  difficulty?: string
): Promise<MiddlegamePosition> {
  const positions = await loadMiddlegamePositions();
  const filtered = difficulty
    ? positions.filter((p) => p.difficulty === difficulty)
    : positions;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export async function getRandomEndgame(
  difficulty?: string
): Promise<EndgamePosition> {
  const positions = await loadEndgamePositions();
  const filtered = difficulty
    ? positions.filter((p) => p.difficulty === difficulty)
    : positions;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
