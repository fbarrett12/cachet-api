import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/env";
import { importSharedBet } from "../../src/imports/service";

const mocks = vi.hoisted(() => ({
  createBetImport: vi.fn(),
  updateBetImportAfterParse: vi.fn(),
  createBetWithLegs: vi.fn(),
  fetchHtml: vi.fn(),
  parseSharePage: vi.fn(),
  normalizeParsedBet: vi.fn(),
}));

vi.mock("../../src/imports/repository", () => ({
  createBetImport: mocks.createBetImport,
  updateBetImportAfterParse: mocks.updateBetImportAfterParse,
}));

vi.mock("../../src/db/bets", () => ({
  createBetWithLegs: mocks.createBetWithLegs,
}));

vi.mock("../../src/lib/fetchHtml", () => ({
  fetchHtml: mocks.fetchHtml,
}));

vi.mock("../../src/parsers", () => ({
  parseSharePage: mocks.parseSharePage,
}));

vi.mock("../../src/normalization/service", () => ({
  normalizeParsedBet: mocks.normalizeParsedBet,
}));

describe("importSharedBet", () => {
  const env = {} as Env;

  const authUser = {
    id: "user-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createBetImport.mockResolvedValue({
      id: "import-123",
      sportsbookSlug: "draftkings",
      parseStatus: "pending",
    });

    mocks.updateBetImportAfterParse.mockResolvedValue(undefined);

    mocks.createBetWithLegs.mockResolvedValue({
      betId: "bet-123",
    });
  });

  it("does not fetch generic HTML for DraftKings imports", async () => {
    const parsedBet = {
      sportsbook: "draftkings",
      betType: "single",
      legs: [],
    };

    const normalizedBet = {
      sportsbook: "draftkings",
      betType: "single",
      legs: [],
    };

    mocks.parseSharePage.mockResolvedValue({
      parsedBet,
      parseStatus: "parsed",
      rawPayload: {
        source: "draftkings-social-api",
      },
    });

    mocks.normalizeParsedBet.mockReturnValue(normalizedBet);

    await importSharedBet(env, {
      authUser,
      shareUrl:
        "https://sportsbook.draftkings.com/social/post/test-post-id?slipAdd",
    });

    expect(mocks.fetchHtml).not.toHaveBeenCalled();

    expect(mocks.parseSharePage).toHaveBeenCalledWith("draftkings", {
      html: "",
      shareUrl:
        "https://sportsbook.draftkings.com/social/post/test-post-id?slipAdd",
    });
  });

  it("fetches share-page HTML for FanDuel imports", async () => {
    const shareUrl = "https://sportsbook.fanduel.com/example";

    mocks.fetchHtml.mockResolvedValue("<html>FanDuel bet</html>");

    mocks.createBetImport.mockResolvedValue({
        id: "import-456",
        sportsbookSlug: "fanduel",
        parseStatus: "pending",
    });

    mocks.parseSharePage.mockResolvedValue({
        parsedBet: null,
        parseStatus: "failed",
        errorMessage: "Test parser failure.",
    });

    await importSharedBet(env, {
        authUser,
        shareUrl,
    });

    expect(mocks.fetchHtml).toHaveBeenCalledOnce();
    expect(mocks.fetchHtml).toHaveBeenCalledWith(shareUrl);

    expect(mocks.parseSharePage).toHaveBeenCalledWith("fanduel", {
        html: "<html>FanDuel bet</html>",
        shareUrl,
    });
  });
});