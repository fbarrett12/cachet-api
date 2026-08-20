import type { Env } from "../env";
import {
  getMarketRankings,
  getPlayerRankings,
} from "./rankingsRepository";

function percentage(
  numerator: number,
  denominator: number,
): number {
  if (denominator === 0) return 0;

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
      const hits = Number(row.hits);
      const misses = Number(row.misses);

      return {
        playerId: row.player_id,
        playerName: row.player_name,
        totalSelections: Number(
          row.total_selections,
        ),
        hits,
        misses,
        hitRate: percentage(
          hits,
          hits + misses,
        ),
      };
    }),

    markets: marketRows.map((row) => {
      const hits = Number(row.hits);
      const misses = Number(row.misses);

      return {
        marketName: row.market_name,
        totalSelections: Number(
          row.total_selections,
        ),
        hits,
        misses,
        hitRate: percentage(
          hits,
          hits + misses,
        ),
      };
    }),
  };
}