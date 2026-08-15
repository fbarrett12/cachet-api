import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftKingsBetJson } from "../../src/types/draftkings";

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

const mocks = vi.hoisted(() => ({
  fetchDraftKingsSocialPost: vi.fn(),
}));

vi.mock("../../src/parsers/draftkingsApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/parsers/draftkingsApi")>();

  return {
    ...actual,
    fetchDraftKingsSocialPost: mocks.fetchDraftKingsSocialPost,
  };
});

import { parseDraftKingsSharePageFromUrl } from "../../src/parsers/draftkings";

describe("parseDraftKingsSharePageFromUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expands a nested DraftKings SGP into atomic legs while preserving the group", async () => {
    const betJson: DraftKingsBetJson = {
      betId: "bet-123",
      type: "sgpx",
      status: "won",
      stake: 10,
      payout: 40,
      potentialPayout: 40,

      events: [
        {
          eventId: "event-123",
          name: "DET Tigers @ CHI Cubs",
          sportName: "Baseball",
          leagueName: "MLB",
          startDate: "2026-07-22T00:05:00Z",
        },
      ],

      combinationOutcomes: [
        {
          eventId: "event-123",
          providerSelectionId: "sgp-parent-123",
          outcomeLabel: "2 Pick SGP",

          nestedSGPSelections: [
            {
              eventId: "event-123",
              offerLabel: "Seiya Suzuki Hits + Runs + RBIs",
              outcomeLabel: "2+",
              playedOddsAmerican: "−115",
              status: "won",
            },
            {
              eventId: "event-123",
              offerLabel: "Nico Hoerner Hits + Runs + RBIs",
              outcomeLabel: "2+",
              playedOddsAmerican: "−115",
              status: "won",
            },
          ],
        },
      ],
    };

    const encodedBetJson = encodeBase64Utf8(JSON.stringify(betJson));

    mocks.fetchDraftKingsSocialPost.mockResolvedValue({
      post: {
        key: "08f25964-ec93-4681-95d5-0cf8013b90a8",
        postEntries: [
          {
            metadataProperties: {
              properties: {
                name: "betJSON",
                value: encodedBetJson,
              },
            },
          },
        ],
      },
    });

    const result = await parseDraftKingsSharePageFromUrl(
      "https://sportsbook.draftkings.com/social/post/08f25964-ec93-4681-95d5-0cf8013b90a8?slipAdd",
    );

    expect(result.parseStatus).toBe("parsed");
    expect(result.parsedBet).not.toBeNull();

    const parsedBet = result.parsedBet!;

    // One sportsbook SGP container remains one Cachet group.
    expect(parsedBet.groups).toHaveLength(1);
    expect(parsedBet.groups?.[0].groupType).toBe("same_game_parlay");
    expect(parsedBet.groups?.[0].label).toBe("2 Pick SGP");

    // But analytics receive the two actual selections.
    expect(parsedBet.groups?.[0].legs).toHaveLength(2);
    expect(parsedBet.legs).toHaveLength(2);

    expect(parsedBet.legs[0]).toMatchObject({
      sport: "Baseball",
      league: "MLB",
      eventName: "DET Tigers @ CHI Cubs",
      marketSubtype: "Seiya Suzuki Hits + Runs + RBIs",
      selectionType: "2+",
      oddsAmerican: -115,
      result: "won",
      parentExternalId: "sgp-parent-123",
      legOrder: 0,
    });

    expect(parsedBet.legs[1]).toMatchObject({
      sport: "Baseball",
      league: "MLB",
      eventName: "DET Tigers @ CHI Cubs",
      marketSubtype: "Nico Hoerner Hits + Runs + RBIs",
      selectionType: "2+",
      oddsAmerican: -115,
      result: "won",
      parentExternalId: "sgp-parent-123",
      legOrder: 1,
    });
  });
});