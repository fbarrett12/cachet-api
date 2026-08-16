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
        player_name: "Aaron Judge",
        total_legs: "9",
        wins: "6",
        losses: "3",
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
      playerName: "Aaron Judge",
      totalLegs: 9,
      wins: 6,
      losses: 3,
      winRate: 66.7,
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