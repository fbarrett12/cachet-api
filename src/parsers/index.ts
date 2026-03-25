import type { Sportsbook } from "../types/bets";
import type { ParserResult } from "../types/parsers";
import { parseDraftKingsSharePageFromUrl } from "./draftkings";
import { parseFanDuelSharePage } from "./fanduel";

export async function parseSharePage(
  sportsbook: Sportsbook,
  input: { html: string; shareUrl: string },
): Promise<ParserResult> {
  switch (sportsbook) {
    case "draftkings":
      return parseDraftKingsSharePageFromUrl(input.shareUrl);
    case "fanduel":
      return parseFanDuelSharePage(input.html);
    default:
      return {
        parsedBet: null,
        parseStatus: "failed",
        errorMessage: "Unsupported sportsbook.",
      };
  }
}