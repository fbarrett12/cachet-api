import { parseDraftKingsSharePage } from "./draftkings";
import { parseFanDuelSharePage } from "./fanduel";
import type { Sportsbook } from "../types/bets";
import type { ParserResult } from "../types/parsers";

export function parseSharePage(
  sportsbook: Sportsbook,
  html: string,
): ParserResult {
  switch (sportsbook) {
    case "draftkings":
      return parseDraftKingsSharePage(html);
    case "fanduel":
      return parseFanDuelSharePage(html);
    default:
      return {
        parsedBet: null,
        parseStatus: "failed",
        errorMessage: "Unsupported sportsbook.",
      };
  }
}