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
});