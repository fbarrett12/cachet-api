import type { Env } from "../env";
import {
  getMarketRankings,
  getPlayerRankings,
} from "./rankingsRepository";

function percentage(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator === 0) return null;

  return Number(
    ((numerator / denominator) * 100).toFixed(1),
  );
}

export async function getBettorRankings(
  env: Env,
  input: {
    userId: string;
  },
) {
  const [
    playerRows,
    marketRows,
  ] = await Promise.all([
    getPlayerRankings(env, input),
    getMarketRankings(env, input),
  ]);

  return {
    players: playerRows.map((row) => {
      const totalSelections = Number(row.total_selections);
      const hits = Number(row.hits);
      const misses = Number(row.misses);
      const settledSelections = hits + misses;

      return {
        playerId: row.player_id,
        playerName: row.player_name,
        totalSelections,
        settledSelections,
        pendingSelections: totalSelections - settledSelections,
        hits,
        misses,
        hitRate: percentage(
          hits,
          settledSelections,
        ),
      };
    }),

    markets: marketRows.map((row) => {
      const totalSelections = Number(row.total_selections);
      const hits = Number(row.hits);
      const misses = Number(row.misses);
      const settledSelections = hits + misses;

      return {
        marketName: row.market_name,
        totalSelections,
        settledSelections,
        pendingSelections: totalSelections - settledSelections,
        hits,
        misses,
        hitRate: percentage(
          hits,
          settledSelections,
        ),
      };
    }),
  };
}
