import { describe, expect, it } from "vitest";
import { normalizeParsedBet } from "../../src/normalization/service";

describe("normalizeParsedBet", () => {
  it("extracts a player from an MLB HRRBI market", () => {
    const parsedBet = {
      sportsbook: "draftkings" as const,
      betType: "single" as const,
      legs: [
        {
          sport: "Baseball",
          league: "MLB",
          eventName: "MIA Marlins @ HOU Astros",
          marketType: "game",
          marketSubtype: "Yordan Alvarez Hits + Runs + RBIs",
          selectionType: "3+",
          oddsAmerican: 100,
        },
      ],
    };

    const normalized = normalizeParsedBet(parsedBet);

    expect(normalized.legs[0].playerName).toBe("Yordan Alvarez");
    expect(normalized.legs[0].marketName).toBe("Hits + Runs + RBIs");
  });

  it("detects live player props", () => {
    const parsedBet = {
      sportsbook: "draftkings" as const,
      betType: "single" as const,
      legs: [
        {
          marketSubtype: "Live Devin Booker Points",
          selectionType: "Over 27.5",
        },
      ],
    };

    const normalized = normalizeParsedBet(parsedBet);

    expect(normalized.legs[0].playerName).toBe("Devin Booker");
    expect(normalized.legs[0].marketName).toBe("Points");
    expect(normalized.legs[0].isLive).toBe(true);
  });

  it("keeps moneyline as a non-player market", () => {
    const parsedBet = {
      sportsbook: "draftkings" as const,
      betType: "single" as const,
      legs: [
        {
          marketSubtype: "Moneyline",
          selectionType: "GS Warriors",
        },
      ],
    };

    const normalized = normalizeParsedBet(parsedBet);

    expect(normalized.legs[0].playerName).toBeUndefined();
    expect(normalized.legs[0].marketName).toBe("Moneyline");
  });

  it("preserves the raw sportsbook market value", () => {
    const parsedBet = {
      sportsbook: "draftkings" as const,
      betType: "single" as const,
      legs: [
        {
          marketSubtype: "Shohei Ohtani Hits + Runs + RBIs",
        },
      ],
    };

    const normalized = normalizeParsedBet(parsedBet);

    expect(normalized.legs[0].rawMarketSubtype).toBe(
      "Shohei Ohtani Hits + Runs + RBIs",
    );
  });

  it("preserves nested SGP legs while normalizing them", () => {
    const parsedBet = {
      sportsbook: "draftkings" as const,
      betType: "sgpx" as const,
      groups: [
        {
          groupType: "same_game_parlay" as const,
          label: "2 Pick SGP",
          legs: [
            {
              marketSubtype: "Seiya Suzuki Hits + Runs + RBIs",
              selectionType: "2+",
            },
            {
              marketSubtype: "Nico Hoerner Hits + Runs + RBIs",
              selectionType: "2+",
            },
          ],
        },
      ],
      legs: [],
    };

    const normalized = normalizeParsedBet(parsedBet);

    expect(normalized.groups).toHaveLength(1);
    expect(normalized.groups?.[0].legs).toHaveLength(2);
    expect(normalized.legs).toHaveLength(2);

    expect(normalized.legs[0].playerName).toBe("Seiya Suzuki");
    expect(normalized.legs[1].playerName).toBe("Nico Hoerner");
  });
});