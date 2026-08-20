import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type PlayerBettingPerformanceRow = {
  player_id: string;
  player_name: string;

  total_legs: string;
  leg_hits: string;
  leg_misses: string;

  total_bets: string;
  bet_wins: string;
  bet_losses: string;
};

export type PlayerMarketPerformanceRow = {
  market_name: string;
  total_selections: string;
  hits: string;
  misses: string;
};

export type PlayerLosingBetAttributionRow = {
  bet_id: string;
  player_market: string | null;
  losing_leg_player_name: string | null;
  losing_leg_market: string | null;
  losing_leg_result: string | null;
};

export async function getPlayerBettingPerformance(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
): Promise<PlayerBettingPerformanceRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
        select
            p.id as player_id,
            p.display_name as player_name,

            count(bl.id)::text as total_legs,

            count(*) filter (
                where lower(bl.result) = 'won'
            )::text as leg_hits,

            count(*) filter (
                where lower(bl.result) = 'lost'
            )::text as leg_misses,

            count(distinct b.id)::text as total_bets,

            count(distinct b.id) filter (
                where lower(b.status) = 'won'
            )::text as bet_wins,

            count(distinct b.id) filter (
                where lower(b.status) = 'lost'
            )::text as bet_losses

        from players p

        join bet_legs bl
            on bl.canonical_player_id = p.id

        join bets b
            on b.id = bl.bet_id

        where p.id = $1
            and b.user_id = $2

        group by
            p.id,
            p.display_name

        limit 1
    `;

    const values = [
      input.playerId,
      input.userId,
    ];

    const result =
      await client.query<PlayerBettingPerformanceRow>(sql, values);

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function getPlayerMarketPerformance(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
): Promise<PlayerMarketPerformanceRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        bl.market_subtype as market_name,

        count(bl.id)::text as total_selections,

        count(*) filter (
          where lower(bl.result) = 'won'
        )::text as hits,

        count(*) filter (
          where lower(bl.result) = 'lost'
        )::text as misses

      from bet_legs bl

      join bets b
        on b.id = bl.bet_id

      where bl.canonical_player_id = $1
        and b.user_id = $2
        and bl.market_subtype is not null

      group by bl.market_subtype

      order by count(bl.id) desc
    `;

    const values = [
      input.playerId,
      input.userId,
    ];

    const result =
      await client.query<PlayerMarketPerformanceRow>(
        sql,
        values,
      );

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function getPlayerLosingBetAttribution(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
): Promise<PlayerLosingBetAttributionRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        b.id as bet_id,

        player_leg.market_subtype as player_market,

        losing_leg.player_name as losing_leg_player_name,
        losing_leg.market_subtype as losing_leg_market,
        losing_leg.result as losing_leg_result

      from bet_legs player_leg

      join bets b
        on b.id = player_leg.bet_id

      join bet_legs losing_leg
        on losing_leg.bet_id = b.id
        and losing_leg.id <> player_leg.id

      where player_leg.canonical_player_id = $1
        and b.user_id = $2
        and lower(player_leg.result) = 'won'
        and lower(b.status) = 'lost'
        and lower(losing_leg.result) = 'lost'

      order by b.created_at desc
    `;

    const values = [
      input.playerId,
      input.userId,
    ];

    const result =
      await client.query<PlayerLosingBetAttributionRow>(
        sql,
        values,
      );

    return result.rows;
  } finally {
    await client.end();
  }
}