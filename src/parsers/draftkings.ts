import type { ParserResult } from "../types/parsers";
import type { DraftKingsBetJson } from "../types/draftkings";
import {
  decodeBase64Json,
  extractBetJsonBase64,
  extractDraftKingsPostIdFromUrl,
  fetchDraftKingsSocialPost,
} from "./draftkingsApi";

function mapDraftKingsBetType(value: string | undefined) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "parlay") return "parlay";
  if (normalized === "single") return "single";
  if (normalized === "round_robin") return "round_robin";

  return "unknown";
}

function parseAmericanOdds(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const normalized = value
    .replace(/\u2212/g, "-") // Unicode minus → normal hyphen
    .replace(/[^\d-]/g, "");

  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function parseDraftKingsSharePageFromUrl(
  shareUrl: string,
): Promise<ParserResult> {
  const postId = extractDraftKingsPostIdFromUrl(shareUrl);

  if (!postId) {
    return {
      parsedBet: null,
      parseStatus: "failed",
      errorMessage: "Could not extract DraftKings post ID from share URL.",
    };
  }

  const socialPayload = await fetchDraftKingsSocialPost(postId);
  const betJsonBase64 = extractBetJsonBase64(socialPayload);

  if (!betJsonBase64) {
    return {
      parsedBet: null,
      parseStatus: "failed",
      errorMessage: "DraftKings social payload did not contain betJSON.",
      rawPayload: {
        parser: "draftkings_social_v1",
        postId,
        socialKeys: Object.keys(socialPayload.post ?? {}),
      },
    };
  }

  let betJson: DraftKingsBetJson;

  try {
    betJson = decodeBase64Json<DraftKingsBetJson>(betJsonBase64);
  } catch {
    return {
      parsedBet: null,
      parseStatus: "failed",
      errorMessage: "Failed to decode DraftKings betJSON payload.",
      rawPayload: {
        parser: "draftkings_social_v1",
        postId,
        betJsonBase64Length: betJsonBase64.length,
      },
    };
  }

  const legs =
    betJson.combinationOutcomes?.map((outcome) => ({
      sport: undefined,
      league: undefined,
      eventName:
        outcome.awayTeamName && outcome.homeTeamName
          ? `${outcome.awayTeamName} @ ${outcome.homeTeamName}`
          : undefined,
      marketType: "game",
      marketSubtype: outcome.offerLabel,
      selectionType: outcome.outcomeLabel,
      playerName: undefined,
      lineValue: undefined,
      oddsAmerican: parseAmericanOdds(outcome.playedOddsAmerican),
      startsAt: undefined,
    })) ?? [];

  return {
    parsedBet: {
      sportsbook: "draftkings",
      betType: mapDraftKingsBetType(betJson.type),
      legs,
    },
    parseStatus: "parsed",
    rawPayload: {
      parser: "draftkings_social_v1",
      postId,
      betId: betJson.betId,
      status: betJson.status,
      stake: betJson.stake,
      payout: betJson.payout,
      potentialPayout: betJson.potentialPayout,
      type: betJson.type,
      eventCount: betJson.events?.length ?? 0,
      combinationOutcomeCount: betJson.combinationOutcomes?.length ?? 0,
    },
  };
}