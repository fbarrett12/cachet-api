import type { BetType, ParsedBetGroup, ParsedBetLeg } from "../types/bets";
import type { DraftKingsBetJson, DraftKingsOutcome } from "../types/draftkings";
import type { ParserResult } from "../types/parsers";
import {
  decodeBase64Json,
  extractBetJsonBase64,
  extractDraftKingsPostIdFromUrl,
  fetchDraftKingsSocialPost,
} from "./draftkingsApi";

function mapDraftKingsBetType(value: string | undefined): BetType {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "parlay") return "parlay";
  if (normalized === "single") return "single";
  if (normalized === "round_robin") return "round_robin";
  if (normalized === "sgpx") return "sgpx";

  return "unknown";
}

function parseAmericanOdds(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const normalized = value.replace(/\u2212/g, "-").replace(/[^\d-]/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function findEvent(
  betJson: DraftKingsBetJson,
  eventId: string | undefined,
) {
  return betJson.events?.find((event) => event.eventId === eventId);
}

function eventNameForOutcome(
  betJson: DraftKingsBetJson,
  outcome: DraftKingsOutcome,
): string | undefined {
  const event = findEvent(betJson, outcome.eventId);

  if (event?.name) return event.name;

  if (outcome.awayTeamName && outcome.homeTeamName) {
    return `${outcome.awayTeamName} @ ${outcome.homeTeamName}`;
  }

  return undefined;
}

function mapOutcomeToLeg(
  betJson: DraftKingsBetJson,
  outcome: DraftKingsOutcome,
  options: {
    parentExternalId?: string;
    legOrder: number;
  },
): ParsedBetLeg {
  const event = findEvent(betJson, outcome.eventId);

  return {
    sport: event?.sportName,
    league: event?.leagueName,
    eventName: eventNameForOutcome(betJson, outcome),
    marketType: "game",
    marketSubtype: outcome.offerLabel,
    selectionType: outcome.outcomeLabel,
    playerName: undefined,
    lineValue: undefined,
    oddsAmerican: parseAmericanOdds(outcome.playedOddsAmerican),
    startsAt: event?.startDate,
    result: outcome.status,
    parentExternalId: options.parentExternalId,
    legOrder: options.legOrder,
  };
}

function buildGroupsAndAtomicLegs(betJson: DraftKingsBetJson): {
  groups: ParsedBetGroup[];
  legs: ParsedBetLeg[];
} {
  const groups: ParsedBetGroup[] = [];
  const legs: ParsedBetLeg[] = [];

  let atomicLegOrder = 0;

  for (const [groupIndex, outcome] of (betJson.combinationOutcomes ?? []).entries()) {
    const nestedSelections = outcome.nestedSGPSelections ?? [];

    if (nestedSelections.length > 0) {
      const groupLegs = nestedSelections.map((nestedOutcome, nestedIndex) => {
        const leg = mapOutcomeToLeg(betJson, nestedOutcome, {
          parentExternalId: outcome.providerSelectionId,
          legOrder: atomicLegOrder + nestedIndex,
        });

        return leg;
      });

      atomicLegOrder += groupLegs.length;
      legs.push(...groupLegs);

      groups.push({
        groupType: "same_game_parlay",
        label: outcome.outcomeLabel ?? `${groupLegs.length} Pick SGP`,
        eventName: eventNameForOutcome(betJson, outcome),
        legOrder: groupIndex,
        legs: groupLegs,
      });

      continue;
    }

    const standaloneLeg = mapOutcomeToLeg(betJson, outcome, {
      parentExternalId: outcome.providerSelectionId,
      legOrder: atomicLegOrder,
    });

    atomicLegOrder += 1;
    legs.push(standaloneLeg);

    groups.push({
      groupType: "standalone",
      label: outcome.offerLabel,
      eventName: standaloneLeg.eventName,
      legOrder: groupIndex,
      legs: [standaloneLeg],
    });
  }

  return { groups, legs };
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
        parser: "draftkings_social_v2_nested",
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
        parser: "draftkings_social_v2_nested",
        postId,
        betJsonBase64Length: betJsonBase64.length,
      },
    };
  }

  const { groups, legs } = buildGroupsAndAtomicLegs(betJson);

  return {
    parsedBet: {
      sportsbook: "draftkings",
      betType: mapDraftKingsBetType(betJson.type),
      externalBetId: betJson.betId,
      status: betJson.status,
      placedAt: betJson.placedDate,
      settledAt: betJson.settlementDate,
      stake: betJson.stake,
      payout: betJson.payout,
      potentialPayout: betJson.potentialPayout,
      groups,
      legs,
    },
    parseStatus: "parsed",
    rawPayload: {
      parser: "draftkings_social_v2_nested",
      postId,
      betId: betJson.betId,
      status: betJson.status,
      stake: betJson.stake,
      payout: betJson.payout,
      potentialPayout: betJson.potentialPayout,
      type: betJson.type,
      eventCount: betJson.events?.length ?? 0,
      topLevelOutcomeCount: betJson.combinationOutcomes?.length ?? 0,
      atomicLegCount: legs.length,
      groupCount: groups.length,
    },
  };
}