import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type EnrichableLegRow = {
  id: string;
  sport: string | null;
  league: string | null;
  market_subtype: string | null;
};

export type CanonicalMatchRow = {
  sport_id: string | null;
  league_id: string | null;
  market_id: string | null;
};

export async function listUnenrichedLegs(
  env: Env,
  input: {
    limit?: number;
  },
): Promise<EnrichableLegRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const sql = `
      select
        id,
        sport,
        league,
        market_subtype
      from bet_legs
      where canonical_league_id is null
      or canonical_market_id is null
      order by created_at asc
      limit $1
    `;

    const values = [limit];

    const result = await client.query<EnrichableLegRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function findCanonicalMarketMatch(
  env: Env,
  input: {
    leagueSlug: string;
    marketSlug: string;
  },
): Promise<CanonicalMatchRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        s.id as sport_id,
        l.id as league_id,
        m.id as market_id
      from markets m
      join leagues l on l.id = m.league_id
      join sports s on s.id = l.sport_id
      where l.slug = $1
      and m.slug = $2
      limit 1
    `;

    const values = [input.leagueSlug, input.marketSlug];

    const result = await client.query<CanonicalMatchRow>(sql, values);

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function updateLegCanonicalRefs(
  env: Env,
  input: {
    legId: string;
    sportId: string | null;
    leagueId: string | null;
    marketId: string | null;
  },
): Promise<void> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      update bet_legs
      set
        canonical_sport_id = $2,
        canonical_league_id = $3,
        canonical_market_id = $4
      where id = $1
    `;

    const values = [
      input.legId,
      input.sportId,
      input.leagueId,
      input.marketId,
    ];

    await client.query(sql, values);
  } finally {
    await client.end();
  }
}

export type EnrichmentMarketSummaryRow = {
  market_subtype: string | null;
  count: string;
};

export type EnrichmentLeagueSummaryRow = {
  league: string | null;
  count: string;
};

export async function summarizeUnenrichedMarkets(
  env: Env,
  input: { limit?: number },
): Promise<EnrichmentMarketSummaryRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const sql = `
      select
        market_subtype,
        count(*)::text as count
      from bet_legs
      where canonical_market_id is null
      group by market_subtype
      order by count(*) desc
      limit $1
    `;

    const values = [limit];

    const result = await client.query<EnrichmentMarketSummaryRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function summarizeUnenrichedLeagues(
  env: Env,
  input: { limit?: number },
): Promise<EnrichmentLeagueSummaryRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const sql = `
      select
        league,
        count(*)::text as count
      from bet_legs
      where canonical_league_id is null
      group by league
      order by count(*) desc
      limit $1
    `;

    const values = [limit];

    const result = await client.query<EnrichmentLeagueSummaryRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function countUnenrichedLegs(env: Env): Promise<number> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select count(*)::text as count
      from bet_legs
      where canonical_league_id is null
      or canonical_market_id is null
    `;

    const values: unknown[] = [];

    const result = await client.query<{ count: string }>(sql, values);

    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}