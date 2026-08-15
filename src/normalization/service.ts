import type { ParsedBet, ParsedBetGroup, ParsedBetLeg } from "../types/bets";
import type {
  NormalizedBet,
  NormalizedBetGroup,
  NormalizedLeg,
} from "./types";

const KNOWN_MARKET_NAMES = [
  "Hits + Runs + RBIs",
  "Points + Rebounds + Assists",
  "Points",
  "Assists",
  "Rebounds",
  "Home Runs",
  "Strikeouts Thrown",
  "Total Bases",
  "Moneyline",
];

function stripLivePrefix(value: string | undefined): {
  value: string | undefined;
  isLive: boolean;
} {
  if (!value) {
    return {
      value,
      isLive: false,
    };
  }

  if (value.toLowerCase().startsWith("live ")) {
    return {
      value: value.slice("Live ".length).trim(),
      isLive: true,
    };
  }

  return {
    value,
    isLive: false,
  };
}

function normalizeMarketSubtype(
  marketSubtype: string | undefined,
): {
  playerName?: string;
  marketName?: string;
  isLive: boolean;
} {
  const stripped = stripLivePrefix(marketSubtype);
  const value = stripped.value;

  if (!value) {
    return {
      isLive: stripped.isLive,
    };
  }

  if (value.toLowerCase() === "moneyline") {
    return {
      marketName: "Moneyline",
      isLive: stripped.isLive,
    };
  }

  for (const marketName of KNOWN_MARKET_NAMES) {
    if (value === marketName) {
      return {
        marketName,
        isLive: stripped.isLive,
      };
    }

    if (value.endsWith(` ${marketName}`)) {
      return {
        playerName: value.slice(0, -marketName.length).trim(),
        marketName,
        isLive: stripped.isLive,
      };
    }
  }

  return {
    marketName: value,
    isLive: stripped.isLive,
  };
}

function normalizeLeg(leg: ParsedBetLeg): NormalizedLeg {
  const normalizedMarket = normalizeMarketSubtype(leg.marketSubtype);

  return {
    eventName: leg.eventName,
    sport: leg.sport,
    league: leg.league,

    playerName: leg.playerName ?? normalizedMarket.playerName,
    teamName: leg.teamName,
    opponentTeamName: undefined,

    marketName: normalizedMarket.marketName,
    marketType: leg.marketType,
    selection: leg.selectionType,
    line: leg.lineValue,

    oddsAmerican: leg.oddsAmerican,
    result: leg.result,
    startsAt: leg.startsAt,

    isLive: normalizedMarket.isLive,

    rawMarketSubtype: leg.marketSubtype,
    rawSelectionType: leg.selectionType,
    rawEventName: leg.eventName,

    parentExternalId: leg.parentExternalId,
    legOrder: leg.legOrder,
  };
}

function normalizeGroup(group: ParsedBetGroup): NormalizedBetGroup {
  return {
    groupType: group.groupType,
    label: group.label,
    eventName: group.eventName,
    legOrder: group.legOrder,
    legs: group.legs.map(normalizeLeg),
  };
}

export function normalizeParsedBet(parsedBet: ParsedBet): NormalizedBet {
  const groups = parsedBet.groups?.map(normalizeGroup);

  const legs = groups?.length
    ? groups.flatMap((group) => group.legs)
    : parsedBet.legs.map(normalizeLeg);

  return {
    sportsbook: parsedBet.sportsbook,
    betType: parsedBet.betType,
    externalBetId: parsedBet.externalBetId,
    status: parsedBet.status,
    placedAt: parsedBet.placedAt,
    settledAt: parsedBet.settledAt,
    stake: parsedBet.stake,
    payout: parsedBet.payout,
    potentialPayout: parsedBet.potentialPayout,
    groups,
    legs,
  };
}