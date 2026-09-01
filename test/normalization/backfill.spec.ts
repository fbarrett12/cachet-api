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
import { NORMALIZATION_VERSION } from "../../src/normalization/normalizer";

describe("backfillNormalizedLegs", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recomputes normalized fields from raw sportsbook data", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-123",
        sport: "Baseball",
        league: "MLB",
        event_name: "NY Yankees @ NY Mets",
        market_type: "game",

        raw_market_subtype:
          "Aaron Judge Hits + Runs + RBIs",

        market_subtype:
          "Hits + Runs + RBIs",

        normalization_version:
          "market_v1",

        selection_type: "3+",
        player_name: "Aaron Judge",
        line_value: null,
        odds_american: 125,
        result: "won",
        starts_at: null,
      },
    ]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledWith(env, {
      legId: "leg-123",
      playerName: "Aaron Judge",
      marketName: "Hits + Runs + RBIs",
      clearCanonicalPlayer: false,
      normalizationVersion: NORMALIZATION_VERSION,
    });

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 1,
      unchangedCount: 0,
      nextCursor: "leg-123",
    });
  });

  it("repairs a futures row using preserved raw sportsbook data", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-future-1",
        sport: "Baseball",
        league: "MLB",
        event_name: null,
        market_type: "game",

        raw_market_subtype:
          "MLB 2026 - Player to Record 30+ Regular Season Home Runs",

        market_subtype:
          "Home Runs",

        normalization_version:
          "market_v1",

        selection_type: "Yes",

        player_name:
          "MLB 2026 - Player to Record 30+ Regular Season",

        line_value: null,
        odds_american: null,
        result: null,
        starts_at: null,
      },
    ]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledWith(env, {
      legId: "leg-future-1",
      playerName: null,
      marketName:
        "MLB 2026 - Player to Record 30+ Regular Season Home Runs",
      clearCanonicalPlayer: true,
      normalizationVersion: NORMALIZATION_VERSION,
    });

    expect(result.updatedCount).toBe(1);
  });

  it("never re-normalizes a row without preserved raw source data", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([]);

    const result = await backfillNormalizedLegs(env, {
      limit: 50,
    });

    expect(mocks.updateNormalizedLeg).not.toHaveBeenCalled();

    expect(result).toEqual({
      inspectedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      nextCursor: null,
    });
  });

  it("passes the cursor and advances through outdated normalization rows", async () => {
    mocks.listLegsNeedingNormalization.mockResolvedValue([
      {
        id: "leg-202",
        sport: "Baseball",
        league: "MLB",
        event_name: null,
        market_type: "game",
        raw_market_subtype: "Moneyline",
        market_subtype: "Moneyline",
        normalization_version: "market_v1",
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
      afterId: "leg-101",
    });

    expect(
      mocks.listLegsNeedingNormalization,
    ).toHaveBeenCalledWith(env, {
      limit: 50,
      afterId: "leg-101",
    });

    expect(result.nextCursor).toBe("leg-202");
  });
});