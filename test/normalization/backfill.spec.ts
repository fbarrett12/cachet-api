import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  listLegsNeedingNormalization: vi.fn(),
  updateNormalizedLeg: vi.fn(),
}));

vi.mock("../../src/normalization/repository", () => ({
  listLegsNeedingNormalization: mocks.listLegsNeedingNormalization,
  updateNormalizedLeg: mocks.updateNormalizedLeg,
}));

import { backfillNormalizedLegs } from "../../src/normalization/service";

describe("backfillNormalizedLegs", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("backfills player and market data for a historical player prop", async () => {
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

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledOnce();

    expect(mocks.updateNormalizedLeg).toHaveBeenCalledWith(env, {
      legId: "leg-123",
      playerName: "Aaron Judge",
      marketName: "Hits + Runs + RBIs",
    });

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 1,
      unchangedCount: 0,
    });
  });

  it("clears an incorrectly normalized player name for a futures market", async () => {
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
    });

    expect(result).toEqual({
      inspectedCount: 1,
      updatedCount: 1,
      unchangedCount: 0,
    });
  });
});