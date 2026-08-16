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

  const totalSelections = Number(row.total_legs);
  const hits = Number(row.leg_hits);
  const misses = Number(row.leg_misses);

  const totalBets = Number(row.total_bets);
  const betWins = Number(row.bet_wins);
  const betLosses = Number(row.bet_losses);

  return {
    playerId: row.player_id,
    playerName: row.player_name,

    legPerformance: {
      totalSelections,
      hits,
      misses,
      hitRate: percentage(hits, hits + misses),
    },

    betPerformance: {
      totalBets,
      wins: betWins,
      losses: betLosses,
      winRate: percentage(betWins, betWins + betLosses),
    },
  };
}