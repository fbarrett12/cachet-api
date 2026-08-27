import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  listLegsNeedingNormalization: vi.fn(),
  updateNormalizedLeg: vi.fn(),
}));

vi.mock("../../src/normalization/repository", () => ({
  listLegsNeedingNormalization:
    mocks.listLegsNeedingNormalization,
  updateNormalizedLeg:
    mocks.updateNormalizedLeg,
}));

import { backfillNormalizedLegs } from "../../src/normalization/service";

describe("backfillNormalizedLegs", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills missing normalization data", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-123",
        sport: "Baseball",
        league: "MLB",
        event_name: "NY Yankees @ NY Mets",
        market_type: "game",
        market_subtype: "Aaron Judge Hits + Runs + RBIs",
        selection_type: "3+",
        player_name: null,
        line_value: null,
        odds_american: 125,
        result: "won",
        starts_at: "2026-05-17T17:00:00Z",
      },
    ]);

    mocks.updateNormalizedLeg.mockResolvedValue(undefined);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledWith(env, {
      legId: "leg-123",
      playerName: "Aaron Judge",
      marketName: "Hits + Runs + RBIs",
      clearCanonicalPlayer: false,
    });

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 1,
      unchangedCount: 0,
      nextCursor: "leg-123",
    });
  });

  it("repairs incorrectly normalized futures data", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-future-1",
        sport: "Baseball",
        league: "MLB",
        event_name: null,
        market_type: "game",
        market_subtype:
          "MLB 2026 - Player to Record 30+ Regular Season Home Runs",
        selection_type: "Yes",
        player_name:
          "MLB 2026 - Player to Record 30+ Regular Season",
        line_value: null,
        odds_american: null,
        result: null,
        starts_at: null,
      },
    ]);

    mocks.updateNormalizedLeg.mockResolvedValue(undefined);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledWith(env, {
      legId: "leg-future-1",
      playerName: null,
      marketName:
        "MLB 2026 - Player to Record 30+ Regular Season Home Runs",
      clearCanonicalPlayer: true,
    });

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 1,
      unchangedCount: 0,
      nextCursor: "leg-future-1",
    });
  });

  it("does not write when stored normalization already matches current normalization", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-456",
        sport: "Baseball",
        league: "MLB",
        event_name: "WAS Nationals @ COL Rockies",
        market_type: "game",
        market_subtype: "Hits + Runs + RBIs",
        selection_type: "2+",
        player_name: "James Wood",
        line_value: null,
        odds_american: -250,
        result: "won",
        starts_at: "2026-07-22T00:40:00Z",
      },
    ]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).not.toHaveBeenCalled();

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 0,
      unchangedCount: 1,
      nextCursor: "leg-456",
    });
  });

  it("passes the cursor to the repository and returns the last inspected id as nextCursor", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-101",
        sport: "Baseball",
        league: "MLB",
        event_name: null,
        market_type: "game",
        market_subtype: "Moneyline",
        selection_type: "NY Yankees",
        player_name: null,
        line_value: null,
        odds_american: -120,
        result: "won",
        starts_at: null,
      },
      {
        id: "leg-202",
        sport: "Baseball",
        league: "MLB",
        event_name: null,
        market_type: "game",
        market_subtype: "Moneyline",
        selection_type: "LA Dodgers",
        player_name: null,
        line_value: null,
        odds_american: -110,
        result: "lost",
        starts_at: null,
      },
    ]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
      afterId: "leg-050",
    });

    expect(
      mocks.listLegsNeedingNormalization,
    ).toHaveBeenCalledWith(env, {
      limit: 50,
      afterId: "leg-050",
    });

    expect(result.nextCursor).toBe("leg-202");
  });

  it("returns null nextCursor when no rows remain", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
      afterId: "leg-final",
    });

    expect(result).toEqual({
      inspectedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      nextCursor: null,
    });
  });
});