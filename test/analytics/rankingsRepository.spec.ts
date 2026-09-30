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

import {
  getMarketRankings,
  getPlayerRankings,
} from "../../src/analytics/rankingsRepository";

describe("rankings user scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDbClient.mockReturnValue({
      connect: mocks.connect,
      query: mocks.query,
      end: mocks.end,
    });
    mocks.query.mockResolvedValue({ rows: [] });
  });

  it.each([
    { name: "players", getRankings: getPlayerRankings },
    { name: "markets", getRankings: getMarketRankings },
  ])("scopes $name to the requested user's bets", async ({ getRankings }) => {
    for (const userId of ["user-123", "user-456"]) {
      await getRankings({} as Env, { userId });

      expect(mocks.query).toHaveBeenLastCalledWith(
        expect.stringMatching(/join bets b\s+on b\.id = bl\.bet_id/),
        [userId],
      );
      expect(mocks.query).toHaveBeenLastCalledWith(
        expect.stringMatching(/where b\.user_id = \$1/),
        [userId],
      );
    }
  });
});
