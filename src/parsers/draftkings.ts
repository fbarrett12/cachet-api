import type { ParserResult } from "../types/parsers";

export function parseDraftKingsSharePage(html: string): ParserResult {
  const normalized = html.toLowerCase();

  if (!normalized.includes("draftkings")) {
    return {
      parsedBet: null,
      parseStatus: "failed",
      errorMessage: "Page did not appear to be a DraftKings share page.",
    };
  }

  return {
    parsedBet: {
      sportsbook: "draftkings",
      betType: "unknown",
      legs: [],
    },
    parseStatus: "parsed",
    rawPayload: {
      parser: "draftkings_stub_v1",
      htmlLength: html.length,
    },
  };
}