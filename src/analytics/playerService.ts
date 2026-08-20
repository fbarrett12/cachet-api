import type { Env } from "../env";
import { 
  getPlayerBettingPerformance,
  getPlayerMarketPerformance,
  getPlayerLosingBetAttribution,
} from "./playerRepository";

function percentage(
  numerator: number,
  denominator: number,
): number {
  if (denominator === 0) return 0;

  return Number(
    ((numerator / denominator) * 100).toFixed(1),
  );
}

type LossContributorRow = {
  losing_leg_player_name: string | null;
  losing_leg_market: string | null;
  bet_id: string;
};

function buildLossContributorSummary(
  rows: LossContributorRow[],
) {
  const grouped = new Map<
    string,
    {
      playerName: string | null;
      marketName: string | null;
      missedCount: number;
      betIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = [
      row.losing_leg_player_name ?? "unknown-player",
      row.losing_leg_market ?? "unknown-market",
    ].join("::");

    const existing = grouped.get(key);

    if (existing) {
      existing.missedCount += 1;
      existing.betIds.add(row.bet_id);
      continue;
    }

    grouped.set(key, {
      playerName: row.losing_leg_player_name,
      marketName: row.losing_leg_market,
      missedCount: 1,
      betIds: new Set([row.bet_id]),
    });
  }

  return Array.from(grouped.values())
    .map((item) => ({
      playerName: item.playerName,
      marketName: item.marketName,
      missedCount: item.missedCount,
      affectedBets: item.betIds.size,
    }))
    .sort((a, b) => {
      if (b.missedCount !== a.missedCount) {
        return b.missedCount - a.missedCount;
      }

      return b.affectedBets - a.affectedBets;
    });
}

export async function getPlayerAnalytics(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
) {
  const [row, marketRows, attributionRows] = await Promise.all([
    getPlayerBettingPerformance(env, input),
    getPlayerMarketPerformance(env, input),
    getPlayerLosingBetAttribution(env, input),
  ]);

  if (!row) {
    return null;
  }

  const totalSelections = Number(row.total_legs);
  const hits = Number(row.leg_hits);
  const misses = Number(row.leg_misses);

  const totalBets = Number(row.total_bets);
  const betWins = Number(row.bet_wins);
  const betLosses = Number(row.bet_losses);

  const lossContributorSummary = buildLossContributorSummary(attributionRows);

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

    marketPerformance: marketRows.map((market) => {
      const marketHits = Number(market.hits);
      const marketMisses = Number(market.misses);

      return {
        marketName: market.market_name,
        totalSelections: Number(
          market.total_selections,
        ),
        hits: marketHits,
        misses: marketMisses,
        hitRate: percentage(
          marketHits,
          marketHits + marketMisses,
        ),
      };
    }),
    losingBetAttribution: attributionRows.map((row) => ({
      betId: row.bet_id,
      playerMarket: row.player_market,

      missedSelection: {
        playerName: row.losing_leg_player_name,
        marketName: row.losing_leg_market,
        result: row.losing_leg_result,
      },
    })),
    
    lossContributorSummary,
  };
}