import type { Env } from "../env";
import { createDbClient } from "./client";

type BetRow = {
  id: string;
  user_id: string | null;
  sportsbook_slug: string | null;
  bet_import_id: string | null;
  external_share_id: string | null;
  bet_type: string;
  status: string;
  placed_at: string | null;
  event_start_at: string | null;
  stake_cents: number | null;
  to_win_cents: number | null;
  payout_cents: number | null;
  odds_american: number | null;
  odds_decimal: string | null;
  is_user_confirmed: boolean;
  placed_confirmed_at: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
};

type BetLegRow = {
  id: string;
  sport: string | null;
  league: string | null;
  event_name: string | null;
  market_type: string | null;
  market_subtype: string | null;
  selection_type: string | null;
  player_name: string | null;
  team_name: string | null;
  opponent_name: string | null;
  line_value: string | null;
  odds_american: number | null;
  result: string;
  stat_value: string | null;
  starts_at: string | null;
  created_at: string;
};

function centsToDollars(value: number | null): number | null {
  if (value == null) return null;
  return value / 100;
}

export async function getBetById(env: Env, betId: string) {
  const client = createDbClient(env);
  await client.connect();

  try {
    const betResult = await client.query<BetRow>(
      `
        select
          b.id,
          b.user_id,
          s.slug as sportsbook_slug,
          b.bet_import_id,
          b.external_share_id,
          b.bet_type,
          b.status,
          b.placed_at,
          b.event_start_at,
          b.stake_cents,
          b.to_win_cents,
          b.payout_cents,
          b.odds_american,
          b.odds_decimal,
          b.is_user_confirmed,
          b.placed_confirmed_at,
          b.graded_at,
          b.created_at,
          b.updated_at
        from bets b
        left join sportsbooks s on s.id = b.sportsbook_id
        where b.id = $1
        limit 1
      `,
      [betId],
    );

    const bet = betResult.rows[0];
    if (!bet) return null;

    const legsResult = await client.query<BetLegRow>(
      `
        select
          id,
          sport,
          league,
          event_name,
          market_type,
          market_subtype,
          selection_type,
          player_name,
          team_name,
          opponent_name,
          line_value,
          odds_american,
          result,
          stat_value,
          starts_at,
          created_at
        from bet_legs
        where bet_id = $1
        order by created_at asc
      `,
      [betId],
    );

    return {
      id: bet.id,
      userId: bet.user_id,
      sportsbook: bet.sportsbook_slug,
      betImportId: bet.bet_import_id,
      externalBetId: bet.external_share_id,
      betType: bet.bet_type,
      status: bet.status,
      placedAt: bet.placed_at,
      eventStartAt: bet.event_start_at,
      stake: centsToDollars(bet.stake_cents),
      toWin: centsToDollars(bet.to_win_cents),
      payout: centsToDollars(bet.payout_cents),
      oddsAmerican: bet.odds_american,
      oddsDecimal: bet.odds_decimal ? Number(bet.odds_decimal) : null,
      isUserConfirmed: bet.is_user_confirmed,
      placedConfirmedAt: bet.placed_confirmed_at,
      gradedAt: bet.graded_at,
      createdAt: bet.created_at,
      updatedAt: bet.updated_at,
      legs: legsResult.rows.map((leg) => ({
        id: leg.id,
        sport: leg.sport,
        league: leg.league,
        eventName: leg.event_name,
        marketType: leg.market_type,
        marketSubtype: leg.market_subtype,
        selectionType: leg.selection_type,
        playerName: leg.player_name,
        teamName: leg.team_name,
        opponentName: leg.opponent_name,
        lineValue: leg.line_value != null ? Number(leg.line_value) : null,
        oddsAmerican: leg.odds_american,
        result: leg.result,
        statValue: leg.stat_value != null ? Number(leg.stat_value) : null,
        startsAt: leg.starts_at,
        createdAt: leg.created_at,
      })),
    };
  } finally {
    await client.end();
  }
}