import type { Env } from "../env";
import { getPlayerBettingPerformance } from "./playerRepository";

function percentage(
  numerator: number,
  denominator: number,
): number {
  if (denominator === 0) return 0;

  return Number(
    ((numerator / denominator) * 100).toFixed(1),
  );
}

export async function getPlayerAnalytics(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
) {
  const row = await getPlayerBettingPerformance(env, input);

  if (!row) {
    return null;
  }

  const totalLegs = Number(row.total_legs);
  const wins = Number(row.wins);
  const losses = Number(row.losses);

  return {
    playerId: row.player_id,
    playerName: row.player_name,
    totalLegs,
    wins,
    losses,
    winRate: percentage(wins, wins + losses),
  };
}