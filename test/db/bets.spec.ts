import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";

const mocks = vi.hoisted(() => ({
  createDbClient: vi.fn(),
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
}));

vi.mock("../../src/db/client", () => ({
  createDbClient: mocks.createDbClient,
}));

import { createBetWithLegs } from "../../src/db/bets";
import { NORMALIZATION_VERSION } from "../../src/normalization/normalizer";

describe("createBetWithLegs", () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createDbClient.mockReturnValue({
      connect: mocks.connect,
      query: mocks.query,
      end: mocks.end,
    });
  });

  it("persists raw and normalized market values separately", async () => {
    mocks.query
      .mockResolvedValueOnce(undefined) // begin
      .mockResolvedValueOnce({
        rows: [{ id: "bet-123" }],
      }) // bet insert
      .mockResolvedValueOnce({
        rows: [{ id: "group-123" }],
      }) // group insert
      .mockResolvedValueOnce({
        rows: [],
      }) // leg insert
      .mockResolvedValueOnce(undefined); // commit

    await createBetWithLegs(env, {
      userId: "user-123",
      sportsbookSlug: "draftkings",
      betImportId: "import-123",

      parsedBet: {
        sportsbook: "draftkings",
        betType: "single",
        legs: [],
      },

      normalizedBet: {
        sportsbook: "draftkings",
        betType: "single",
        groups: [
          {
            groupType: "standalone",
            label: "Ungrouped",
            legOrder: 0,
            legs: [
              {
                playerName: "James Wood",
                marketName: "Hits + Runs + RBIs",

                rawMarketSubtype:
                  "James Wood Hits + Runs + RBIs",

                rawSelectionType: "2+",
                selection: "2+",

                isLive: false,
              },
            ],
          },
        ],
        legs: [],
      },
    });

    const legInsertCall =
      mocks.query.mock.calls.find(([sql]) =>
        typeof sql === "string" &&
        sql.includes("insert into bet_legs"),
      );

    expect(legInsertCall).toBeDefined();

    const [sql, values] = legInsertCall!;

    expect(sql).toContain("raw_market_subtype");
    expect(sql).toContain("normalization_version");

    expect(values).toContain(
      "James Wood Hits + Runs + RBIs",
    );

    expect(values).toContain(
      "Hits + Runs + RBIs",
    );

    expect(values).toContain(
      "James Wood",
    );

    expect(values).toContain(
      NORMALIZATION_VERSION,
    );
  });
});