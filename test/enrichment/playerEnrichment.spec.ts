import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  listLegsNeedingPlayerEnrichment: vi.fn(),
  findPlayersByNameAndLeague: vi.fn(),
  createCanonicalPlayer: vi.fn(),
  attachCanonicalPlayerToLeg: vi.fn(),
}));

vi.mock("../../src/enrichment/playerRepository", () => ({
  listLegsNeedingPlayerEnrichment:
    mocks.listLegsNeedingPlayerEnrichment,

  findPlayersByNameAndLeague:
    mocks.findPlayersByNameAndLeague,

  createCanonicalPlayer:
    mocks.createCanonicalPlayer,

  attachCanonicalPlayerToLeg:
    mocks.attachCanonicalPlayerToLeg,
}));

import { enrichCanonicalPlayers } from "../../src/enrichment/playerService.ts";

describe("enrichCanonicalPlayers", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a canonical player and attaches it to the leg", async () => {
    mocks.listLegsNeedingPlayerEnrichment.mockResolvedValue([
      {
        id: "leg-123",
        player_name: "Aaron Judge",
        league: "MLB",
      },
    ]);

    mocks.findPlayersByNameAndLeague.mockResolvedValue([]);

    mocks.createCanonicalPlayer.mockResolvedValue({
      id: "player-123",
      display_name: "Aaron Judge",
    });

    mocks.attachCanonicalPlayerToLeg.mockResolvedValue(undefined);

    const result = await enrichCanonicalPlayers(env, {
      limit: 50,
    });

    expect(mocks.findPlayersByNameAndLeague).toHaveBeenCalledWith(env, {
      playerName: "Aaron Judge",
      leagueSlug: "mlb",
    });

    expect(mocks.createCanonicalPlayer).toHaveBeenCalledWith(env, {
      displayName: "Aaron Judge",
      leagueSlug: "mlb",
    });

    expect(mocks.attachCanonicalPlayerToLeg).toHaveBeenCalledWith(env, {
      legId: "leg-123",
      playerId: "player-123",
    });

    expect(result).toEqual({
      inspectedCount: 1,
      matchedCount: 0,
      createdCount: 1,
      skippedCount: 0,
    });
  });

  it("reuses an existing canonical player instead of creating a duplicate", async () => {
    mocks.listLegsNeedingPlayerEnrichment.mockResolvedValue([
        {
            id: "leg-456",
            player_name: "Aaron Judge",
            league: "MLB",
        },
    ]);

    mocks.findPlayersByNameAndLeague.mockResolvedValue([
        {
            id: "player-123",
            display_name: "Aaron Judge",
        },
    ]);

    mocks.attachCanonicalPlayerToLeg.mockResolvedValue(undefined);

    const result = await enrichCanonicalPlayers(env, {
        limit: 50,
    });

    expect(mocks.createCanonicalPlayer).not.toHaveBeenCalled();

    expect(mocks.attachCanonicalPlayerToLeg).toHaveBeenCalledWith(env, {
        legId: "leg-456",
        playerId: "player-123",
    });

    expect(result).toEqual({
        inspectedCount: 1,
        matchedCount: 1,
        createdCount: 0,
        skippedCount: 0,
    });
  });

  it("skips enrichment when multiple canonical players match", async () => {
    mocks.listLegsNeedingPlayerEnrichment.mockResolvedValue([
        {
            id: "leg-789",
            player_name: "John Smith",
            league: "NBA",
        },
    ]);

    mocks.findPlayersByNameAndLeague.mockResolvedValue([
        {
            id: "player-a",
            display_name: "John Smith",
        },
        {
            id: "player-b",
            display_name: "John Smith",
        },
    ]);

    const result = await enrichCanonicalPlayers(env, {
        limit: 50,
    });

    expect(mocks.createCanonicalPlayer).not.toHaveBeenCalled();
    expect(mocks.attachCanonicalPlayerToLeg).not.toHaveBeenCalled();

    expect(result).toEqual({
        inspectedCount: 1,
        matchedCount: 0,
        createdCount: 0,
        skippedCount: 1,
    });
  });
});