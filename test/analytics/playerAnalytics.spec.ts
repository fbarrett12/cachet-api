import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  getPlayerBettingPerformance: vi.fn(),
  getPlayerMarketPerformance: vi.fn(),
  getPlayerLosingBetAttribution: vi.fn(),
}));

vi.mock("../../src/analytics/playerRepository", () => ({
  getPlayerBettingPerformance:
    mocks.getPlayerBettingPerformance,

  getPlayerMarketPerformance:
    mocks.getPlayerMarketPerformance,

  getPlayerLosingBetAttribution:
    mocks.getPlayerLosingBetAttribution,
}));

import { getPlayerAnalytics } from "../../src/analytics/playerService.ts";

describe("getPlayerAnalytics", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns player betting performance for the current user", async () => {
    mocks.getPlayerBettingPerformance.mockResolvedValue({
        player_id: "player-123",
        player_name: "James Wood",

        total_legs: "2",
        leg_hits: "2",
        leg_misses: "0",

        total_bets: "2",
        bet_wins: "0",
        bet_losses: "2",

    });

    mocks.getPlayerMarketPerformance.mockResolvedValue([{
      market_name: "Hits + Runs + RBIs",
      total_selections: "2",
      hits: "2",
      misses: "0",
          },
          {
            market_name: "Home Runs",
            total_selections: "1",
            hits: "0",
            misses: "1",
          },
        ],
    );

    mocks.getPlayerLosingBetAttribution.mockResolvedValue([
      {
        bet_id: "bet-1",
        player_market: "Hits + Runs + RBIs",
        losing_leg_player_name: "Aaron Judge",
        losing_leg_market: "Home Runs",
        losing_leg_result: "lost",
      },
      {
        bet_id: "bet-2",
        player_market: "Hits + Runs + RBIs",
        losing_leg_player_name: "Aaron Judge",
        losing_leg_market: "Home Runs",
        losing_leg_result: "lost",
      },
      {
        bet_id: "bet-2",
        player_market: "Hits + Runs + RBIs",
        losing_leg_player_name: "Yordan Alvarez",
        losing_leg_market: "Home Runs",
        losing_leg_result: "lost",
      },
    ]);

    const result = await getPlayerAnalytics(env, {
      userId: "user-123",
      playerId: "player-123",
    });

    expect(mocks.getPlayerBettingPerformance).toHaveBeenCalledWith(env, {
      userId: "user-123",
      playerId: "player-123",
    });

    expect(mocks.getPlayerMarketPerformance).toHaveBeenCalledWith(env, {
      userId: "user-123",
      playerId: "player-123",
    });

    expect(mocks.getPlayerLosingBetAttribution).toHaveBeenCalledWith(env, {
      userId: "user-123",
      playerId: "player-123",
    });

    expect(result).toEqual({
        playerId: "player-123",
        playerName: "James Wood",

        legPerformance: {
        totalSelections: 2,
        hits: 2,
        misses: 0,
        hitRate: 100,
        },

        betPerformance: {
        totalBets: 2,
        wins: 0,
        losses: 2,
        winRate: 0,
        },

        marketPerformance: [
          {
            marketName: "Hits + Runs + RBIs",
            totalSelections: 2,
            hits: 2,
            misses: 0,
            hitRate: 100,
          },
          {
            marketName: "Home Runs",
            totalSelections: 1,
            hits: 0,
            misses: 1,
            hitRate: 0,
          },
        ],

        losingBetAttribution: [
          {
            betId: "bet-1",
            playerMarket: "Hits + Runs + RBIs",
            missedSelection: {
            playerName: "Aaron Judge",
            marketName: "Home Runs",
            result: "lost",
            },
          },
          {
            betId: "bet-2",
            playerMarket: "Hits + Runs + RBIs",
            missedSelection: {
            playerName: "Aaron Judge",
            marketName: "Home Runs",
            result: "lost",
            },
          },
          {
            betId: "bet-2",
            playerMarket: "Hits + Runs + RBIs",
            missedSelection: {
            playerName: "Yordan Alvarez",
            marketName: "Home Runs",
            result: "lost",
            },
          },
        ],
        lossContributorSummary: [
          {
            playerName: "Aaron Judge",
            marketName: "Home Runs",
            missedCount: 2,
            affectedBets: 2,
          },
          {
            playerName: "Yordan Alvarez",
            marketName: "Home Runs",
            missedCount: 1,
            affectedBets: 1,
          },
        ],
      });
  });

  it("returns null when the user has no betting history for the player", async () => {
    mocks.getPlayerBettingPerformance.mockResolvedValue(null);
    mocks.getPlayerMarketPerformance.mockResolvedValue([]);
    mocks.getPlayerLosingBetAttribution.mockResolvedValue([]);

    const result = await getPlayerAnalytics(env, {
        userId: "user-123",
        playerId: "player-999",
    });

    expect(result).toBeNull();

    expect(mocks.getPlayerBettingPerformance).toHaveBeenCalledWith(env, {
        userId: "user-123",
        playerId: "player-999",
    });

    expect(mocks.getPlayerMarketPerformance).toHaveBeenCalledWith(env, {
        userId: "user-123",
        playerId: "player-999",
    });

    expect(mocks.getPlayerLosingBetAttribution).toHaveBeenCalledWith(env, {
        userId: "user-123",
        playerId: "player-999",
    });
  });
});