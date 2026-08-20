import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type PlayerRankingRow = {
  player_id: string;
  player_name: string;
  total_selections: string;
  hits: string;
  misses: string;
};

export type MarketRankingRow = {
  market_name: string;
  total_selections: string;
  hits: string;
  misses: string;
};

export async function getPlayerRankings(
  env: Env,
  input: {
    userId: string;
  },
): Promise<PlayerRankingRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        p.id as player_id,
        p.display_name as player_name,

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

      join players p
        on p.id = bl.canonical_player_id

      where b.user_id = $1

      group by
        p.id,
        p.display_name

      order by count(bl.id) desc
    `;

    const values = [input.userId];

    const result =
      await client.query<PlayerRankingRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function getMarketRankings(
  env: Env,
  input: {
    userId: string;
  },
): Promise<MarketRankingRow[]> {
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

      where b.user_id = $1
        and bl.market_subtype is not null

      group by bl.market_subtype

      order by count(bl.id) desc
    `;

    const values = [input.userId];

    const result =
      await client.query<MarketRankingRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}