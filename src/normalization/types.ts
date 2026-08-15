export type NormalizedBet = {
  sportsbook: string;
  betType: string;
  externalBetId?: string;
  status?: string;
  placedAt?: string;
  settledAt?: string;
  stake?: number;
  payout?: number;
  potentialPayout?: number;
  groups?: NormalizedBetGroup[];
  legs: NormalizedLeg[];
};

export type NormalizedBetGroup = {
  groupType: "standalone" | "same_game_parlay";
  label?: string;
  eventName?: string;
  legOrder?: number;
  legs: NormalizedLeg[];
};

export type NormalizedLeg = {
  eventName?: string;
  sport?: string;
  league?: string;

  playerName?: string;
  teamName?: string;
  opponentTeamName?: string;

  marketName?: string;
  marketType?: string;
  selection?: string;
  line?: number;

  oddsAmerican?: number;
  result?: string;
  startsAt?: string;

  isLive: boolean;

  rawMarketSubtype?: string;
  rawSelectionType?: string;
  rawEventName?: string;

  parentExternalId?: string;
  legOrder?: number;
};