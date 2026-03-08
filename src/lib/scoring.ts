export function calcMatchPoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): number {
  // Exact score: 7 points
  if (predHome === realHome && predAway === realAway) return 7;

  const predWinner =
    predHome > predAway ? "home" : predHome < predAway ? "away" : "draw";
  const realWinner =
    realHome > realAway ? "home" : realHome < realAway ? "away" : "draw";

  if (predWinner === realWinner) {
    // Correct draw but not exact: 3 points
    if (predWinner === "draw") return 3;
    // Correct winner + one team's goals correct: 4 points
    if (predHome === realHome || predAway === realAway) return 4;
    // Correct winner only: 3 points
    return 3;
  }

  // Wrong winner but got one team's goals correct: 1 point
  if (predHome === realHome || predAway === realAway) return 1;

  return 0;
}

export const PHASE_POINTS: Record<string, number> = {
  ROUND_32: 2,
  ROUND_16: 4,
  QUARTERS: 6,
  SEMIS: 8,
  FINAL: 14,
};

export const CHAMPION_POINTS = 25;
export const RUNNER_UP_POINTS = 20;
export const THIRD_PLACE_POINTS = 15;

export const PHASE_LABELS: Record<string, string> = {
  GROUP: "Fase de Grupos",
  ROUND_32: "32 avos de Final",
  ROUND_16: "Oitavas de Final",
  QUARTERS: "Quartas de Final",
  SEMIS: "Semifinais",
  THIRD_PLACE: "Disputa 3º Lugar",
  FINAL: "Final",
};
