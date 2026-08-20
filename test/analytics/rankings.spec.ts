import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  getPlayerRankings: vi.fn(),
  getMarketRankings: vi.fn(),
}));

vi.mock("../../src/analytics/rankingsRepository", () => ({
  getPlayerRankings: mocks.getPlayerRankings,
  getMarketRankings: mocks.getMarketRankings,
}));

import { getBettorRankings } from "../../src/analytics/rankingsService.ts";

describe("getBettorRankings", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns strongest and weakest player and market performance", async () => {
    mocks.getPlayerRankings.mockResolvedValue([
      {
        player_id: "player-1",
        player_name: "James Wood",
        total_selections: "12",
        hits: "9",
        misses: "3",
      },
      {
        player_id: "player-2",
        player_name: "Aaron Judge",
        total_selections: "10",
        hits: "4",
        misses: "6",
      },
    ]);

    mocks.getMarketRankings.mockResolvedValue([
      {
        market_name: "Hits + Runs + RBIs",
        total_selections: "15",
        hits: "11",
        misses: "4",
      },
      {
        market_name: "Home Runs",
        total_selections: "10",
        hits: "3",
        misses: "7",
      },
    ]);

    const result = await getBettorRankings(env, {
      userId: "user-123",
    });

    expect(mocks.getPlayerRankings).toHaveBeenCalledWith(env, {
      userId: "user-123",
    });

    expect(mocks.getMarketRankings).toHaveBeenCalledWith(env, {
      userId: "user-123",
    });

    expect(result).toEqual({
      players: [
        {
          playerId: "player-1",
          playerName: "James Wood",
          totalSelections: 12,
          hits: 9,
          misses: 3,
          hitRate: 75,
        },
        {
          playerId: "player-2",
          playerName: "Aaron Judge",
          totalSelections: 10,
          hits: 4,
          misses: 6,
          hitRate: 40,
        },
      ],
      markets: [
        {
          marketName: "Hits + Runs + RBIs",
          totalSelections: 15,
          hits: 11,
          misses: 4,
          hitRate: 73.3,
        },
        {
          marketName: "Home Runs",
          totalSelections: 10,
          hits: 3,
          misses: 7,
          hitRate: 30,
        },
      ],
    });
  });
});