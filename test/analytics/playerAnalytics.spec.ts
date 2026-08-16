import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  getPlayerBettingPerformance: vi.fn(),
}));

vi.mock("../../src/analytics/playerRepository", () => ({
  getPlayerBettingPerformance:
    mocks.getPlayerBettingPerformance,
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

    const result = await getPlayerAnalytics(env, {
      userId: "user-123",
      playerId: "player-123",
    });

    expect(mocks.getPlayerBettingPerformance).toHaveBeenCalledWith(env, {
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
    });
  });

  it("returns null when the user has no betting history for the player", async () => {
    mocks.getPlayerBettingPerformance.mockResolvedValue(null);

    const result = await getPlayerAnalytics(env, {
        userId: "user-123",
        playerId: "player-999",
    });

    expect(result).toBeNull();

    expect(mocks.getPlayerBettingPerformance).toHaveBeenCalledWith(env, {
        userId: "user-123",
        playerId: "player-999",
    });
  });
});