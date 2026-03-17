import type { ParserResult } from "../types/parsers";

export function parseFanDuelSharePage(html: string): ParserResult {
  const normalized = html.toLowerCase();

  if (!normalized.includes("fanduel")) {
    return {
      parsedBet: null,
      parseStatus: "failed",
      errorMessage: "Page did not appear to be a FanDuel share page.",
    };
  }

  return {
    parsedBet: {
      sportsbook: "fanduel",
      betType: "unknown",
      legs: [],
    },
    parseStatus: "parsed",
    rawPayload: {
      parser: "fanduel_stub_v1",
      htmlLength: html.length,
    },
  };
}